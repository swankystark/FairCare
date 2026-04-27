from folktables import ACSDataSource

data_source = ACSDataSource(
    survey_year='2023',
    horizon='1-Year',
    survey='person',
    root_dir="D:/acs_data"   # 👈 CHANGE THIS
)

acs_data = data_source.get_data(states=["CA"], download=True)