""" Machine translation using Google Cloud API """

import json
import sys
from google.cloud import translate

client = translate.Client()
text_to_translate = sys.argv[1]
target_language = sys.argv[2]
raw_output = client.translate(text_to_translate, target_language=target_language)
json_output = json.dumps(raw_output)
print(json_output)
sys.stdout.flush()
