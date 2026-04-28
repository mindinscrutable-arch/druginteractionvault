import urllib.request, json
res = urllib.request.urlopen('http://localhost:8000/api/v1/drugs?page=1&limit=5')
data = json.loads(res.read())
print(f"Total drugs: {data['total']}")
print(f"Sample: {[d['brand_name'] for d in data['drugs'][:3]]}")
