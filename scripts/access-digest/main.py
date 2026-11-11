import json

from digest import lambda_handler

if __name__ == "__main__":
    print(json.dumps(lambda_handler({}, None), ensure_ascii=False))
