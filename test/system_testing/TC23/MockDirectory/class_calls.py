class Processor:
    def __init__(self):
        self.data = []

    def load(self, raw_data):
        self.validate(raw_data)
        self.data = raw_data

    def validate(self, data):
        self.check_integrity()

    def check_integrity(self):
        pass

    def run(self):
        self.load([1, 2, 3])
        self.process_items()

    def process_items(self):
        for item in self.data:
            self.transform(item)
    
    def transform(self, item):
        return item * 2

def entry_point():
    p = Processor()
    p.run()
