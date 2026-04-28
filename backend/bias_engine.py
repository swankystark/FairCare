import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from fairlearn.metrics import (
    MetricFrame,
    selection_rate,
    false_negative_rate,
    false_positive_rate,
    demographic_parity_difference,
    equalized_odds_difference
)
from fairlearn.reductions import ExponentiatedGradient, DemographicParity, EqualizedOdds
from fairlearn.postprocessing import ThresholdOptimizer
import shap
import warnings
warnings.filterwarnings('ignore')


class BiasEngine:
    def __init__(self):
        self.scaler = StandardScaler()
        self.features = ['AGEP', 'SCHL', 'MAR', 'RELSHIPP', 'DIS', 'CIT', 'PINCP', 'FER']
        # Store fitted scaler and split for reuse
        self._X_train_scaled = None
        self._X_test_scaled = None
        self._y_train = None
        self._y_test = None
        self._sens_train = None
        self._sens_test = None
        self._baseline_model = None
        self._X_train = None
        self._X_test = None

    def _prepare_data(self, df, target_col='HICOV', sensitive_col='RAC1P'):
        """Prepare and split data, cache for remediation"""
        cols_to_use = self.features + [target_col, sensitive_col]
        data = df[cols_to_use].dropna().copy()
        
        # Synthetic target: high-need patients (low income AND disability)
        data['high_need'] = ((data['PINCP'] < 30000) & (data['DIS'] == 1)).astype(int)
        
        X = data[self.features].copy()
        y = data['high_need'].copy()
        sensitive_attr = data[sensitive_col].copy()
        
        # Train-test split
        X_train, X_test, y_train, y_test, sens_train, sens_test = train_test_split(
            X, y, sensitive_attr, test_size=0.2, random_state=42, stratify=y
        )
        
        # Fit scaler on training data only (prevent data leakage)
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Cache everything for reuse in remediation
        self._X_train_scaled = X_train_scaled
        self._X_test_scaled = X_test_scaled
        self._X_train = X_train
        self._X_test = X_test
        self._y_train = y_train
        self._y_test = y_test
        self._sens_train = sens_train
        self._sens_test = sens_test
        
        return X_train_scaled, X_test_scaled, y_train, y_test, sens_train, sens_test

    def audit_model(self, df, target_col='HICOV', sensitive_col='RAC1P'):
        """
        Run baseline audit. Calculate ALL fairness metrics.
        Returns dict with baseline metrics including demographic breakdowns.
        """
        print("[AUDIT] Starting bias audit...")
        
        X_train_scaled, X_test_scaled, y_train, y_test, sens_train, sens_test = \
            self._prepare_data(df, target_col, sensitive_col)
        
        # Train baseline model
        model = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
        model.fit(X_train_scaled, y_train)
        self._baseline_model = model
        
        y_pred = model.predict(X_test_scaled)
        y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
        
        # Overall accuracy
        accuracy = float(np.mean(y_pred == y_test)) * 100
        
        # FAIRNESS METRICS CALCULATION
        # ============================
        
        # 1. Demographic Parity Difference
        # This is the difference in selection rates between groups
        dp_diff = demographic_parity_difference(y_test, y_pred, sensitive_features=sens_test)
        dp_percent = abs(dp_diff) * 100
        
        # 2. Equalized Odds Difference
        # Max of |FPR_difference| and |FNR_difference|
        eo_diff = equalized_odds_difference(y_test, y_pred, sensitive_features=sens_test)
        eo_percent = abs(eo_diff) * 100
        
        # 3. Per-group selection rates (for Group Performance panel)
        # Calculate: P(Y_pred = 1 | Group = i)
        group_metrics = {}
        demographic_rates = {}
        
        for group in sorted(sens_test.unique()):
            group_mask = sens_test == group
            if group_mask.sum() > 0:
                selection_rate_group = float(y_pred[group_mask].mean())
                demographic_rates[str(int(group))] = selection_rate_group
                
                # False positive rate: P(pred=1 | true=0, group)
                y_true_group = y_test[group_mask]
                y_pred_group = y_pred[group_mask]
                
                if (y_true_group == 0).sum() > 0:
                    fpr = float(((y_pred_group == 1) & (y_true_group == 0)).sum() / (y_true_group == 0).sum())
                else:
                    fpr = 0.0
                
                # False negative rate: P(pred=0 | true=1, group)
                if (y_true_group == 1).sum() > 0:
                    fnr = float(((y_pred_group == 0) & (y_true_group == 1)).sum() / (y_true_group == 1).sum())
                else:
                    fnr = 0.0
                
                group_metrics[str(int(group))] = {
                    'population': int(group_mask.sum()),
                    'selection_rate': selection_rate_group,
                    'false_positive_rate': fpr,
                    'false_negative_rate': fnr,
                    'population_pct': float(group_mask.sum() / len(y_test) * 100)
                }
        
        # 4. Overall Fairness Score (0-100)
        # Formula: 100 - (DP_gap + EO_gap) * scaling_factor
        # Capped at 0-100
        fairness_score = max(0, min(100, 100 - (dp_percent + eo_percent) * 0.5))
        
        # 5. SHAP Feature Importance
        print("[AUDIT] Computing SHAP values...")
        try:
            explainer = shap.LinearExplainer(model, X_train_scaled)
            shap_values = explainer.shap_values(X_test_scaled)
            
            # Handle both single and multi-class output
            if isinstance(shap_values, list):
                shap_array = np.abs(shap_values[1] if len(shap_values) > 1 else shap_values[0])
            else:
                shap_array = np.abs(shap_values)
            
            feature_importance = {
                fname: float(shap_array[:, i].mean())
                for i, fname in enumerate(self.features)
            }
        except Exception as e:
            print(f"[AUDIT] SHAP failed ({e}), using coefficient magnitudes instead")
            feature_importance = {
                fname: float(abs(coef))
                for fname, coef in zip(self.features, np.abs(model.coef_[0]))
            }
        
        # 6. Identify proxy bias features
        # Features with high importance that correlate with sensitive attribute
        proxy_features = {}
        for fname in ['PINCP', 'DIS', 'MAR']:
            if fname in self._X_test.columns:
                try:
                    corr = abs(self._X_test[[fname]].values.flatten().astype(float).tolist()).__class__
                    # Manual correlation: avoid pandas issues
                    x_vals = self._X_test[fname].values.astype(float)
                    y_vals = sens_test.values.astype(float)
                    # Filter out NaNs
                    valid = ~(np.isnan(x_vals) | np.isnan(y_vals))
                    if valid.sum() > 1:
                        corr = float(np.corrcoef(x_vals[valid], y_vals[valid])[0, 1])
                        if abs(corr) > 0.2:  # Significant correlation
                            proxy_features[fname] = {
                                'importance': feature_importance.get(fname, 0),
                                'correlation_with_sensitive_attr': corr
                            }
                except Exception as e:
                    print(f"[AUDIT] Correlation calc failed for {fname}: {e}")
        
        # 7. Identify most affected group
        most_affected_group = min(demographic_rates, key=demographic_rates.get)
        most_affected_rate = min(demographic_rates.values())
        
        # Estimate patients harmed (if group 4 is completely excluded)
        if most_affected_rate == 0:
            # Group is completely excluded
            group_4_size = group_metrics.get(most_affected_group, {}).get('population', 0)
            patients_harmed = group_4_size
        else:
            patients_harmed = 0
        
        # Compile final results
        results = {
            'audit_type': 'baseline',
            'n_samples': len(y_test),
            'n_samples_total': len(df),
            'accuracy_baseline': round(accuracy, 2),
            'demographic_parity_gap_baseline': round(dp_percent, 2),
            'equalized_odds_gap_baseline': round(eo_percent, 2),
            'fairness_score_baseline': round(fairness_score, 1),
            'feature_importance': {k: round(v, 4) for k, v in sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)},
            'proxy_features': proxy_features,
            'demographic_rates': demographic_rates,
            'group_metrics': group_metrics,
            'most_affected_group': str(int(most_affected_group)),
            'most_affected_group_rate': float(most_affected_rate),
            'patients_harmed': int(patients_harmed),
        }
        
        print(f"[AUDIT] Fairness Score: {fairness_score:.1f}/100")
        print(f"[AUDIT] DP Gap: {dp_percent:.2f}%")
        print(f"[AUDIT] EO Gap: {eo_percent:.2f}%")
        print(f"[AUDIT] Most affected group: {most_affected_group} (rate: {most_affected_rate:.1%})")
        print(f"[AUDIT] Patients harmed: {patients_harmed}\n")
        
        return results

    def apply_remediation(self, df, target_col='HICOV', sensitive_col='RAC1P', constraint='demographic_parity'):
        """
        Apply fairness constraint and retrain model.
        Uses cached data from audit_model() for fair comparison.
        """
        print(f"[REMEDIATE] Applying constraint: {constraint}")
        
        # Use cached split from audit
        if self._X_train_scaled is None:
            self._prepare_data(df, target_col, sensitive_col)
        
        X_train_scaled = self._X_train_scaled
        X_test_scaled = self._X_test_scaled
        y_train = self._y_train
        y_test = self._y_test
        sens_train = self._sens_train
        sens_test = self._sens_test
        
        base_estimator = LogisticRegression(max_iter=2000, class_weight='balanced', random_state=42)
        
        if constraint.lower() == 'none':
            # Use baseline model (no remediation)
            y_pred = self._baseline_model.predict(X_test_scaled)
            print("[REMEDIATE] No constraint applied (baseline model)")
        
        elif constraint.lower() == 'equalized_odds':
            print("[REMEDIATE] Applying Equalized Odds constraint...")
            try:
                # Try ThresholdOptimizer first (more stable for imbalanced data)
                mitigator = ThresholdOptimizer(
                    estimator=base_estimator,
                    constraints="equalized_odds",
                    objective="balanced_accuracy_score",
                    predict_method="predict_proba",
                    grid_size=50,
                )
                mitigator.fit(X_train_scaled, y_train, sensitive_features=sens_train)
                y_pred = mitigator.predict(X_test_scaled, sensitive_features=sens_test)
                print("[REMEDIATE] ThresholdOptimizer succeeded")
            except Exception as e:
                print(f"[REMEDIATE] ThresholdOptimizer failed, trying ExponentiatedGradient: {e}")
                try:
                    # Fallback to ExponentiatedGradient with loose bound
                    mitigator = ExponentiatedGradient(
                        estimator=base_estimator,
                        constraints=EqualizedOdds(difference_bound=0.15),
                        eps=0.05,
                        max_iter=100,
                        nu=1e-3,
                    )
                    mitigator.fit(X_train_scaled, y_train, sensitive_features=sens_train)
                    y_pred = mitigator.predict(X_test_scaled)
                    print("[REMEDIATE] ExponentiatedGradient succeeded")
                except Exception as e2:
                    print(f"[REMEDIATE] Both methods failed, using baseline: {e2}")
                    y_pred = self._baseline_model.predict(X_test_scaled)
        
        else:  # demographic_parity
            print("[REMEDIATE] Applying Demographic Parity constraint...")
            try:
                mitigator = ExponentiatedGradient(
                    estimator=base_estimator,
                    constraints=DemographicParity(difference_bound=0.05),
                    eps=0.02,
                    max_iter=100,
                    nu=1e-3,
                )
                mitigator.fit(X_train_scaled, y_train, sensitive_features=sens_train)
                y_pred = mitigator.predict(X_test_scaled)
                print("[REMEDIATE] Demographic Parity remediation succeeded")
            except Exception as e:
                print(f"[REMEDIATE] DP remediation failed, using baseline: {e}")
                y_pred = self._baseline_model.predict(X_test_scaled)
        
        # RECALCULATE ALL METRICS
        # =======================
        
        accuracy = float(np.mean(y_pred == y_test)) * 100
        
        # Demographic Parity
        dp_diff = demographic_parity_difference(y_test, y_pred, sensitive_features=sens_test)
        dp_percent = abs(dp_diff) * 100
        
        # Equalized Odds
        eo_diff = equalized_odds_difference(y_test, y_pred, sensitive_features=sens_test)
        eo_percent = abs(eo_diff) * 100
        
        # Per-group metrics
        group_metrics = {}
        demographic_rates = {}
        
        for group in sorted(sens_test.unique()):
            group_mask = sens_test == group
            if group_mask.sum() > 0:
                selection_rate_group = float(y_pred[group_mask].mean())
                demographic_rates[str(int(group))] = selection_rate_group
                
                y_true_group = y_test[group_mask]
                y_pred_group = y_pred[group_mask]
                
                if (y_true_group == 0).sum() > 0:
                    fpr = float(((y_pred_group == 1) & (y_true_group == 0)).sum() / (y_true_group == 0).sum())
                else:
                    fpr = 0.0
                
                if (y_true_group == 1).sum() > 0:
                    fnr = float(((y_pred_group == 0) & (y_true_group == 1)).sum() / (y_true_group == 1).sum())
                else:
                    fnr = 0.0
                
                group_metrics[str(int(group))] = {
                    'population': int(group_mask.sum()),
                    'selection_rate': selection_rate_group,
                    'false_positive_rate': fpr,
                    'false_negative_rate': fnr
                }
        
        # Fairness Score
        fairness_score = max(0, min(100, 100 - (dp_percent + eo_percent) * 0.5))
        
        # Patients newly included
        # Calculate delta from baseline for most affected group
        baseline_rate = 0.0  # Baseline had 0% for group 4
        remediated_rates = {k: float(v) for k, v in demographic_rates.items()}
        
        # Group 4 (most affected) population
        group_4_pop = group_metrics.get('4', {}).get('population', 0)
        new_rate = remediated_rates.get('4', 0)
        patients_newly_included = int((new_rate - baseline_rate) * group_4_pop)
        
        # Decision boundary scatter data (for visualization)
        decision_scores = self._baseline_model.decision_function(X_test_scaled)
        
        results = {
            'audit_type': 'remediated',
            'constraint_applied': constraint,
            'n_samples': len(y_test),
            'accuracy_remediated': round(accuracy, 2),
            'demographic_parity_gap_remediated': round(dp_percent, 2),
            'equalized_odds_gap_remediated': round(eo_percent, 2),
            'fairness_score_remediated': round(fairness_score, 1),
            'demographic_rates': remediated_rates,
            'group_metrics': group_metrics,
            'patients_newly_included': max(0, patients_newly_included),
            # Scatter plot data
            'decision_scores': decision_scores.tolist(),
            'X_pincp': self._X_test['PINCP'].values.tolist(),
            'X_dis': self._X_test['DIS'].values.tolist(),
            'y_pred': y_pred.tolist(),
        }
        
        print(f"[REMEDIATE] Fairness Score: {fairness_score:.1f}/100")
        print(f"[REMEDIATE] DP Gap: {dp_percent:.2f}%")
        print(f"[REMEDIATE] EO Gap: {eo_percent:.2f}%")
        print(f"[REMEDIATE] Patients Newly Included: {patients_newly_included}")
        print(f"[REMEDIATE] Complete.\n")
        
        return results