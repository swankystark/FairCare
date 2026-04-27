import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_sample_weight
from fairlearn.metrics import (
    MetricFrame,
    selection_rate,
    false_negative_rate,
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

    def _prepare_data(self, df, target_col='HICOV', sensitive_col='RAC1P'):
        cols_to_use = self.features + [target_col, sensitive_col]
        data = df[cols_to_use].dropna().copy()

        # Synthetic target: high-need patients (low income AND disability)
        data['high_need'] = ((data['PINCP'] < 30000) & (data['DIS'] == 1)).astype(int)

        X = data[self.features]
        y = data['high_need']
        sensitive_attr = data[sensitive_col]

        X_train, X_test, y_train, y_test, sens_train, sens_test = train_test_split(
            X, y, sensitive_attr, test_size=0.2, random_state=42, stratify=y
        )

        # Fit scaler once here — reused in remediation
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # Cache for remediation to use same split/scaler
        self._X_train_scaled = X_train_scaled
        self._X_test_scaled = X_test_scaled
        self._y_train = y_train
        self._y_test = y_test
        self._sens_train = sens_train
        self._sens_test = sens_test

        return X_train_scaled, X_test_scaled, y_train, y_test, sens_train, sens_test

    def audit_model(self, df, target_col='HICOV', sensitive_col='RAC1P'):
        X_train_scaled, X_test_scaled, y_train, y_test, sens_train, sens_test = \
            self._prepare_data(df, target_col, sensitive_col)

        # Train baseline model with class weighting to handle imbalance
        model = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
        model.fit(X_train_scaled, y_train)
        y_pred = model.predict(X_test_scaled)

        # Fairness Metrics
        metrics = {
            'selection_rate': selection_rate,
            'false_negative_rate': false_negative_rate,
        }
        mf = MetricFrame(
            metrics=metrics,
            y_true=y_test,
            y_pred=y_pred,
            sensitive_features=sens_test
        )

        # SHAP Values
        explainer = shap.LinearExplainer(model, X_train_scaled)
        shap_values = explainer.shap_values(X_test_scaled)

        eo_val = equalized_odds_difference(y_test, y_pred, sensitive_features=sens_test)
        dp_val = demographic_parity_difference(y_test, y_pred, sensitive_features=sens_test)

        return {
            "accuracy": float(model.score(X_test_scaled, y_test)),
            "fairness_metrics": mf.by_group.to_dict(),
            "group_names": sens_test.unique().tolist(),
            "demographic_parity": float(abs(dp_val)),
            "equalized_odds": float(abs(eo_val)),
            "shap_summary": dict(zip(self.features, np.abs(shap_values).mean(0).tolist()))
        }

    def apply_remediation(self, df, target_col='HICOV', sensitive_col='RAC1P', constraint='demographic_parity'):
        # Re-use cached split/scaler from last audit call for fair comparison
        # If no audit has been run yet, prepare data fresh
        if self._X_train_scaled is None:
            self._prepare_data(df, target_col, sensitive_col)

        X_train_scaled = self._X_train_scaled
        X_test_scaled = self._X_test_scaled
        y_train = self._y_train
        y_test = self._y_test
        sens_train = self._sens_train
        sens_test = self._sens_test

        base_estimator = LogisticRegression(max_iter=2000, class_weight='balanced', random_state=42)

        if constraint == 'equalized_odds':
            # For EO on heavily imbalanced data, ThresholdOptimizer is far more
            # reliable than ExponentiatedGradient — it doesn't degenerate.
            # It finds per-group decision thresholds that equalize TPR/FPR.
            try:
                mitigator = ThresholdOptimizer(
                    estimator=base_estimator,
                    constraints="equalized_odds",
                    objective="balanced_accuracy_score",
                    predict_method="predict_proba",
                    grid_size=100,
                )
                mitigator.fit(X_train_scaled, y_train, sensitive_features=sens_train)
                y_pred = mitigator.predict(X_test_scaled, sensitive_features=sens_test)
                print("[EO] ThresholdOptimizer succeeded.")
            except Exception as e:
                print(f"[EO] ThresholdOptimizer failed ({e}), falling back to ExponentiatedGradient.")
                # Fallback: ExponentiatedGradient with looser bound
                mitigator = ExponentiatedGradient(
                    estimator=base_estimator,
                    constraints=EqualizedOdds(difference_bound=0.1),
                    eps=0.05,
                    max_iter=100,
                    nu=1e-3,
                )
                mitigator.fit(X_train_scaled, y_train, sensitive_features=sens_train)
                y_pred = mitigator.predict(X_test_scaled)
        else:
            # DemographicParity — ExponentiatedGradient works well here
            mitigator = ExponentiatedGradient(
                estimator=base_estimator,
                constraints=DemographicParity(difference_bound=0.05),
                eps=0.02,
                max_iter=100,
                nu=1e-3,
            )
            mitigator.fit(X_train_scaled, y_train, sensitive_features=sens_train)
            y_pred = mitigator.predict(X_test_scaled)

        # Compute post-remediation metrics
        metrics = {
            'selection_rate': selection_rate,
            'false_negative_rate': false_negative_rate,
        }
        mf = MetricFrame(
            metrics=metrics,
            y_true=y_test,
            y_pred=y_pred,
            sensitive_features=sens_test
        )

        eo_val = equalized_odds_difference(y_test, y_pred, sensitive_features=sens_test)
        dp_val = demographic_parity_difference(y_test, y_pred, sensitive_features=sens_test)

        return {
            "accuracy": float(np.mean(y_pred == y_test)),
            "fairness_metrics": mf.by_group.to_dict(),
            "group_names": sens_test.unique().tolist(),
            "demographic_parity": float(abs(dp_val)),
            "equalized_odds": float(abs(eo_val)),
            "constraint_used": constraint,
        }