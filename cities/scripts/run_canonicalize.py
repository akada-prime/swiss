from pathlib import Path
import runpy

path = Path(__file__).with_name('canonicalize_ui.py')
text = path.read_text()
old = """    if 'ICC' in gdf.columns:
        swiss = gdf[gdf['ICC'].astype(str).str.upper().eq('CH')]
    elif 'NAME' in gdf.columns:
        swiss = gdf[gdf['NAME'].astype(str).str.lower().str.contains('schweiz|suisse|svizzera|switzerland', regex=True)]
    else:
        raise SystemExit(f'No country discriminator in {list(gdf.columns)}')
"""
new = """    columns = {str(column).upper(): column for column in gdf.columns}
    if 'ICC' in columns:
        field = columns['ICC']
        swiss = gdf[gdf[field].astype(str).str.upper().eq('CH')]
    elif 'NAME' in columns:
        field = columns['NAME']
        swiss = gdf[gdf[field].astype(str).str.lower().str.contains('schweiz|suisse|svizzera|switzerland', regex=True)]
    else:
        raise SystemExit(f'No country discriminator in {list(gdf.columns)}')
"""
if text.count(old) != 1:
    raise SystemExit('swisstopo field normalization target not found')
path.write_text(text.replace(old, new, 1))
runpy.run_path(str(path), run_name='__main__')
