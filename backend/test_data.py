import pandas as pd
import numpy as np

# Load dataset
df = pd.read_csv('/home/swankystark20/FairCare/backend/data/2023/1-Year/psam_p06_sample.csv')

print("Group 4 target distribution:")
print(df[df['RAC1P'] == 4]['HICOV'].value_counts())

print("Group 5 target distribution:")
print(df[df['RAC1P'] == 5]['HICOV'].value_counts())
