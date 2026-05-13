import sqlite3
import requests
import json

conn = sqlite3.connect('drug_vault.db')
c = conn.cursor()
id1 = c.execute("SELECT medication_id FROM medications WHERE brand_name = 'Diflucan'").fetchone()[0]
id2 = c.execute("SELECT medication_id FROM medications WHERE brand_name = 'E-Mycin'").fetchone()[0]

res = requests.post('http://127.0.0.1:8000/api/v1/interactions/check', json={'drug_ids': [id1, id2]})
print(json.dumps(res.json(), indent=2))
