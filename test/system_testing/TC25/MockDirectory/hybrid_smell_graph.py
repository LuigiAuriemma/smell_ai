import pandas as pd
import numpy as np

class DataProcessor:
    def __init__(self):
        self.data = pd.DataFrame({'a': [1, 2, 3], 'b': [4, 5, 6]})

    def process(self):
        self.bad_indexing()
        self.bad_iteration()
        self.recursive_check(3)

    def bad_indexing(self):
        # Explicit dataframe creation to ensure detection
        df = pd.DataFrame({'a': [1, 2, 3]})
        # Smell: Chain Indexing
        val = df['a'][0] 
        print(val)

    def bad_iteration(self):
        # Explicit dataframe creation to ensure detection
        df = pd.DataFrame({'a': [1, 2, 3]})
        # Smell: Unnecessary Iteration
        for index, row in df.iterrows():
            print(row['a'])

    def recursive_check(self, n):
        if n > 0:
            self.recursive_check(n-1)

def main():
    dp = DataProcessor()
    dp.process()

if __name__ == "__main__":
    main()
