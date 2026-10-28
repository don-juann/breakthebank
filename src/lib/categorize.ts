import type { Category, SectionKey } from '../types'

const END = '(?!\\p{L})'
// `$` marks a whole word, everything else matches as a word prefix
export const stems = (list: string) => new RegExp(`(?<!\\p{L})(?:${list.replace(/\$/g, END)})`, 'iu')

const RULES: [Category, RegExp][] = [
  ['dessert', stems('десерт|dessert|торт(?!иль)|cake|cheesecake|cupcake|чизкейк|тирамису|tiramisu|морожен|ice ?cream|gelato|джелато|пломбир|сорбет|sorbet|пирожн|эклер|eclair|макарун|macarons?$|медовик|наполеон|штрудел|strudel|брауни|brownie|маффин|muffin|кекс|панакот|панна.?котт|panna ?cotta|фондан|fondant|пахлав|баклав|baklava|чак.?чак|вафл|waffle|панкейк|pancake|шоколадн|мусс|mousse|суфле|souffl|крем.?брюле|creme brul|меренг|павлов|pavlova|халва|лукум|cookie')],
  ['drinks', stems('сок|juice|вод[аы]$|water|кола|cola|coke|пепси|pepsi|фанта|fanta|спрайт|sprite|чай|tea$|кофе|coffee|латте|latte|капучино|cappuccino|американо|americano|эспрессо|espresso|раф$|лимонад|lemonade|морс|компот|айран|ayran|кумыс|шубат|смузи|smoothie|милкшейк|milkshake|фреш|тоник|tonic|энергет|red ?bull|напит|drink|какао|cocoa|горяч[а-яё]* шоколад|hot chocolate|боржоми|bonaqua|tassay|асем|пив|beer|вин[оа]$|wine|водк|vodka|виск|whisk|коньяк|cognac|ром$|rum$|джин$|gin$|текил|tequila|шампан|champagne|prosecco|просекко|коктейл|cocktail|шот|shot|сидр|cider|ликер|ликёр|мартини|martini|апероль|aperol|спритц|spritz|мохито|mojito|лагер|lager|ipa$|эль$|негрони|negroni|бренди|brandy|hennessy|jameson|jack|бокал')],
]

export function categorize(name: string, section: SectionKey): Category {
  for (const [cat, re] of RULES) if (re.test(name)) return cat
  return section === 'dining' ? 'food' : 'other'
}
