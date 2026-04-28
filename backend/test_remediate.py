import pandas as pd
from bias_engine import BiasEngine

# Load dataset
df = pd.read_csv('data/2023/1-Year/psam_p06_sample.csv').sample(frac=1, random_state=42)

engine = BiasEngine()
print("Auditing...")
engine.audit_model(df, sensitive_col='RAC1P')

print("Remediating DP...")
res_dp = engine.apply_remediation(df, constraint='demographic_parity')

print("Remediating EO...")
res_eo = engine.apply_remediation(df, constraint='equalized_odds')

