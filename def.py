import httpx

url = "https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&page=1&per_page=18&oppstatus=open"

response = httpx.get(url)
data = response.json()

print(type(data["data"]["data"]))

for hackathon in data["data"]["data"]:
    print(hackathon.keys())
    break