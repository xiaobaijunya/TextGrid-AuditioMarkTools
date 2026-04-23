import pathlib
import click
import textgrid
import tqdm


class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end_of_word = False
        self.value = None


class Trie:
    def __init__(self, dict_path):
        self.depth = 0
        self.root = TrieNode()
        self.build_trie(dict_path)

    def insert(self, phonemes, raw_word):
        node = self.root
        for char in phonemes:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end_of_word = True
        node.value = raw_word

    def search(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                return None
            node = node.children[char]
        if node.is_end_of_word:
            return node.value
        return None

    def build_trie(self, dict_path):
        for word, raw in self.read_dictionary(dict_path):
            self.insert(word, raw)

    def read_dictionary(self, filename):
        dictionary = []
        with open(filename, 'r', encoding='utf-8') as file:
            for line in file:
                line = line.strip().split('\t')
                if len(line) == 2:
                    raw = line[0]
                    phonemes = line[1].split()
                    self.depth = max(self.depth, len(phonemes))
                    dictionary.append((phonemes, raw))
        return dictionary


@click.command(help='Generate words tier from phones tier using dictionary')
@click.option('--tg', required=True, help='Path to TextGrids directory')
@click.option('--dictionary', required=True, help='Path to the dictionary file')
@click.option('--out', required=False, help='Path to save the aligned TextGrids (defaults to the input directory)')
@click.option('--overwrite', is_flag=True, help='Overwrite existing files')
def generate_words_from_phones(tg, dictionary, out, overwrite):
    tg_path_in = pathlib.Path(tg)
    dict_path = pathlib.Path(dictionary)
    tg_path_out = pathlib.Path(out) if out is not None else tg_path_in
    tg_path_out.mkdir(parents=True, exist_ok=True)

    trie = Trie(dict_path)

    for p in ['AP', 'SP', 'EP']:
        trie.insert([p], p)

    for tgfile in tqdm.tqdm(tg_path_in.glob('*.TextGrid')):
        tg = textgrid.TextGrid()
        tg.read(str(tgfile))

        phones_tier = tg[1]  # phones tier
        new_words_tier = textgrid.IntervalTier(name='words')

        phone_intervals = [(interval.minTime, interval.maxTime, interval.mark) for interval in phones_tier]

        cursor = 0.0
        phone_temp = []
        phone_time_temp = []

        for start, end, phone in phone_intervals:
            if phone in ['AP', 'SP', 'EP']:
                if phone_temp:
                    word = trie.search(phone_temp)
                    if word:
                        word_start = phone_time_temp[0][0]
                        word_end = phone_time_temp[-1][1]
                        new_words_tier.add(minTime=word_start, maxTime=word_end, mark=word)
                    phone_temp.clear()
                    phone_time_temp.clear()

                if phone in ['SP']:
                    new_words_tier.add(minTime=start, maxTime=end, mark='SP')
                else:
                    new_words_tier.add(minTime=start, maxTime=end, mark=phone)

                cursor = end
            else:
                phone_temp.append(phone)
                phone_time_temp.append((start, end))

                word = trie.search(phone_temp)
                if word:
                    word_start = phone_time_temp[0][0]
                    word_end = phone_time_temp[-1][1]
                    new_words_tier.add(minTime=word_start, maxTime=word_end, mark=word)
                    phone_temp.clear()
                    phone_time_temp.clear()

        tg.tiers[0] = new_words_tier

        tg_file_out = tg_path_out / tgfile.name
        if tg_file_out.exists() and not overwrite:
            print(f'Skipping {tgfile.name} (file exists, use --overwrite to overwrite)')
            continue

        tg.write(str(tg_file_out))
        print(f'Processed {tgfile.name}')


if __name__ == '__main__':
    generate_words_from_phones()
