import json
import sys

with open("/tmp/lh-home.json") as f:
    d = json.load(f)

cats = d["categories"]
print("Home page Lighthouse scores:")
for k, v in cats.items():
    score = v.get("score")
    if score is not None:
        print(f"  {k}: {score:.3f}")
