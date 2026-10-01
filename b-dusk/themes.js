/* Landit, design B (Dusk): colour themes.
   Calm on purpose: no pure black or white, low surface saturation, muted
   accents, text on background between about 12:1 and 13.5:1.
   Category colours are soft and reach 4.5:1 on every surface, so they can
   also be used for small category labels.
   `sidebar` is an extra key used by this design for the deeper side column.
   Checked with: node tools/contrast.mjs b-dusk */
window.LANDIT_THEMES = [
  {
    id: 'dusk',
    name: 'Dusk',
    dark: true,
    default: true,
    colors: {
      bg: '#1F2226',
      sidebar: '#181A1E',
      surface: '#272B31',
      surface2: '#30353C',
      text: '#E4E2DD',
      textMuted: '#A7ABB1',
      border: '#3A3F47',
      accent: '#7FB8AE',
      onAccent: '#14201E',
      focus: '#A9DCD2',
      cat: {
        money: '#C6B78B', welfare: '#8BC68B', council: '#8BADC6', health: '#C78EA3',
        education: '#A995CB', work: '#8BC6A3', transport: '#8D9EC7', childcare: '#BC8EC7',
        family: '#C6938B', energy: '#C6A68B', water: '#8BC0C6', utilities: '#8BC6B7',
        food: '#A6C68B', charity: '#C78DBB', legal: '#9A9ACD', business: '#C0C68B',
      },
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    dark: true,
    colors: {
      bg: '#1D2330',
      sidebar: '#171C27',
      surface: '#252C3A',
      surface2: '#2E3646',
      text: '#E1E6EE',
      textMuted: '#A3ADBD',
      border: '#384254',
      accent: '#93AED6',
      onAccent: '#141B28',
      focus: '#B7CCEB',
      cat: {
        money: '#C6B78B', welfare: '#8BC68B', council: '#8BADC6', health: '#C890A5',
        education: '#AA97CC', work: '#8BC6A3', transport: '#90A1C8', childcare: '#BD90C8',
        family: '#C7948D', energy: '#C6A68B', water: '#8BC0C6', utilities: '#8BC6B7',
        food: '#A6C68B', charity: '#C78EBC', legal: '#9C9CCE', business: '#C0C68B',
      },
    },
  },
  {
    id: 'daylight',
    name: 'Daylight',
    dark: false,
    colors: {
      bg: '#F3F3F1',
      sidebar: '#EAEAE7',
      surface: '#FAFAF8',
      surface2: '#EDEDEA',
      text: '#26292D',
      textMuted: '#5B6068',
      border: '#D9D9D4',
      accent: '#2E7468',
      onAccent: '#F4F8F7',
      focus: '#24665B',
      cat: {
        money: '#766637', welfare: '#377437', council: '#416C8B', health: '#8B415C',
        education: '#5C418B', work: '#377450', transport: '#41578B', childcare: '#7C418B',
        family: '#8B4B41', energy: '#86603F', water: '#377076', utilities: '#367263',
        food: '#517135', charity: '#8B417C', legal: '#41418B', business: '#666C33',
      },
    },
  },
  {
    id: 'sand',
    name: 'Sand',
    dark: false,
    colors: {
      bg: '#F1ECE5',
      sidebar: '#E9E2D7',
      surface: '#F9F6F1',
      surface2: '#ECE6DD',
      text: '#2D2823',
      textMuted: '#62594F',
      border: '#DCD2C4',
      accent: '#8E5B3E',
      onAccent: '#FBF7F2',
      focus: '#7A4A30',
      cat: {
        money: '#716235', welfare: '#346F34', council: '#3F6886', health: '#8B415C',
        education: '#5C418B', work: '#346F4D', transport: '#41578B', childcare: '#7C418B',
        family: '#8B4B41', energy: '#805C3C', water: '#366C72', utilities: '#336D5F',
        food: '#4D6C33', charity: '#8B417C', legal: '#41418B', business: '#616630',
      },
    },
  },
];
