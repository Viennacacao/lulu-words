import type { LearningWord } from "../features/learning/session";

export const sampleWords: LearningWord[] = [
  {
    id: "abandon",
    word: "abandon",
    phonetic: "/əˈbændən/",
    meaning: "v. 放弃；抛弃；离弃",
    mnemonic: "a + band + on：离开一个一直相伴的乐队",
    phrases: "abandon a plan · with abandon · abandon oneself to",
    example: "They had to abandon the project because of rising costs.",
  },
  {
    id: "meticulous",
    word: "meticulous",
    phonetic: "/məˈtɪkjələs/",
    meaning: "adj. 一丝不苟的；非常仔细的",
    mnemonic: "像检查每一个小细节一样认真",
    phrases: "meticulous planning · meticulous attention to detail",
    example: "She kept meticulous records of every transaction.",
  },
  {
    id: "resilient",
    word: "resilient",
    phonetic: "/rɪˈzɪliənt/",
    meaning: "adj. 有韧性的；能迅速恢复的",
    mnemonic: "受到压力后仍然能够恢复原状",
    phrases: "a resilient system · remain resilient",
    example: "The team remained resilient despite the unexpected setback.",
  },
];
