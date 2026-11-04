// The questions customers ask most, in the owner's words. Shown on the
// homepage (after „Вдъхнови се“) and on /faq, by the same component
// (components/Faq.tsx). Plain text; edit it here.

export type FaqItem = {
  question: string;
  answer: string;
  // Hidden while „Под наем“ is off (settings.rent_enabled, her switch at the
  // top of „Каталог“): true only on a question that promises renting.
  rentalOnly?: boolean;
};

export type FaqGroup = {
  title: string;
  // Used instead of `title` while „Под наем“ is off, for a group whose name
  // would otherwise promise rentals the page no longer shows.
  titleRentOff?: string;
  items: FaqItem[];
};

export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: "Резервация",
    items: [
      {
        question: "Колко време предварително да резервирам?",
        answer:
          "Препоръчваме да се свържете с нас поне две седмици преди празника, особено ако желаете персонализирани елементи, които поръчваме специално за вас. Ако всичко необходимо е налично, можем да подготвим украсата и в същия ден.",
      },
      {
        question: "Как протича резервацията?",
        answer:
          "Започва с кратко запитване, с което проверяваме дали избраната дата е свободна. След това обсъждаме заедно идеята, цветовете и персонализациите и ви представяме ясно как ще изглежда крайният резултат, за да знаете точно какво да очаквате. Резервацията се потвърждава с капаро в размер на 20% от крайната цена.",
      },
      {
        question: "Мога ли да променя или откажа резервацията?",
        answer:
          "Да. Промените са възможни, като зависят от това дали украсата включва персонализирани елементи. При отказ капарото не се възстановява.",
      },
    ],
  },
  {
    title: "Цена и заплащане",
    items: [
      {
        question: "Окончателна ли е цената от каталога?",
        answer:
          "Не, но е близка до крайната. Точната сума уточняваме, след като обсъдим детайлите на вашата украса.",
      },
      {
        question: "Има ли капаро?",
        answer: "Да, 20% от крайната цена, платимо при потвърждаване на резервацията.",
      },
      {
        question: "Как мога да платя?",
        answer: "Приемаме плащане в брой, с банков превод и през Revolut.",
      },
    ],
  },
  {
    title: "Монтаж и доставка",
    items: [
      {
        question: "Къде работите?",
        answer:
          "Във Варна и в радиус от около 50 км около града. За адреси извън Варна се начислява такса за път.",
      },
      {
        question: "Колко време отнема монтажът?",
        answer:
          "Обикновено около два часа, в зависимост от размера на украсата и броя на елементите.",
      },
      {
        question: "Кой прибира украсата след празника?",
        answer:
          "Балоните остават за вас; често децата с удоволствие ги спукват след празника. Всичко останало прибира нашият екип. Ако сме се уговорили някой елемент да остане за вас, например надпис или плюшена играчка, той остава при вас.",
      },
      {
        question: "Работите ли на открито?",
        answer:
          "Да. За украса на открито е добре предварително да се запознаем с мястото и терена, за да подготвим всичко по най-добрия начин.",
      },
    ],
  },
  {
    title: "Наем и украса",
    titleRentOff: "Украса по ваша идея",
    items: [
      {
        question: "За колко време се наемат арките и калъфите?",
        answer:
          "Наемът е за три дни: един ден преди събитието, за да огледате всичко спокойно и да планирате подредбата; денят на самото събитие; и един ден след него, за да върнете всичко без напрежение.",
        rentalOnly: true,
      },
      {
        question: "Има ли депозит за наетите артикули?",
        answer: "Да. Размерът му зависи от артикула. При повреда депозитът се задържа.",
        rentalOnly: true,
      },
      {
        question: "Откъде се вземат и връщат?",
        answer: "От адрес, уговорен предварително и удобен и за двете страни.",
        rentalOnly: true,
      },
      {
        question: "Може ли украса по моя идея, в мои цветове или с име?",
        answer:
          "Разбира се. Всичко обсъждаме предварително, а ние ви показваме цветовете и елементите, с които ще изработим украсата, за да имате ясна представа как ще изглежда.",
      },
    ],
  },
];

// The groups to show, given „Под наем“. With the switch off the catalog hides
// everything rentable, so the questions promising three-day rentals and a
// deposit go with it — otherwise the site answers a question it no longer
// offers. Both places that show the FAQ and /faq's FAQPage JSON-LD read the
// groups through here, so the structured data can never claim more than the
// page says. A group left with no questions drops out entirely.
export function visibleFaqGroups(rentEnabled: boolean): FaqGroup[] {
  if (rentEnabled) return FAQ_GROUPS;

  return FAQ_GROUPS.flatMap((group) => {
    const items = group.items.filter((item) => !item.rentalOnly);
    if (items.length === 0) return [];
    return [{ ...group, title: group.titleRentOff ?? group.title, items }];
  });
}
