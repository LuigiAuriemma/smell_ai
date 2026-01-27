def input_data():
    validate()
    process()

def validate():
    check_format()

def check_format():
    pass

def process():
    check_format()
    save()

def save():
    pass

def recurse(n):
    if n > 0:
        recurse(n-1)

def main():
    input_data()
    recurse(5)

if __name__ == "__main__":
    main()
