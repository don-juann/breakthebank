import type { Category, SectionKey } from '../types'

const END = '(?!\\p{L})'
// `$` marks a whole word, everything else matches as a word prefix
export const stems = (list: string) => new RegExp(`(?<!\\p{L})(?:${list.replace(/\$/g, END)})`, 'iu')

const RULES: [Category, RegExp][] = [
  ['hookah', stems('кальян|hookah|чаша$|табак')],
  ['alcohol', stems('пив|beer|вин[оа]$|wine|водк|vodka|виск|whisk|коньяк|cognac|ром$|rum$|джин$|gin$|текил|tequila|шампан|champagne|prosecco|просекко|коктейл|cocktail|шот|shot|сидр|cider|ликер|ликёр|мартини|martini|апероль|aperol|спритц|spritz|мохито|mojito|лагер|lager|ipa$|эль$|негрони|negroni|бренди|brandy|hennessy|jameson|jack|бокал')],
  ['drinks', stems('сок|juice|вод[аы]$|water|кола|cola|coke|пепси|pepsi|фанта|fanta|спрайт|sprite|чай|tea$|кофе|coffee|латте|latte|капучино|cappuccino|американо|americano|эспрессо|espresso|раф$|лимонад|lemonade|морс|компот|айран|ayran|кумыс|шубат|смузи|smoothie|милкшейк|milkshake|фреш|тоник|tonic|энергет|red ?bull|напит|drink|какао|cocoa|боржоми|bonaqua|tassay|асем')],
]

export function categorize(name: string, section: SectionKey): Category {
  for (const [cat, re] of RULES) if (re.test(name)) return cat
  return section === 'dining' ? 'food' : 'other'
}
