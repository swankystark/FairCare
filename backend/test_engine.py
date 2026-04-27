import pandas as pd
from bias_engine import BiasEngine

# Load a sample of your large ACS data
df = pd.read_csv("C:\\Users\\swank\\OneDrive\\Desktop\\hackathon\\SolutionChallenge\\faircare\\backend\\data\\2023\\1-Year\\psam_p06.csv", nrows=10000) # Use the path where your data is
engine = BiasEngine()
results = engine.audit_model(df)
print(results)