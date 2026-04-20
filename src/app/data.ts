export interface Plant {
  id: string;
  family: string;
  scientificName: string;
  localName: string;
  partUsed: string;
  traditionalUse: string;
  phytochemicals: string;
  imppatId: string;
  references: string;
  imageUrl: string;
}

export const plantsData: Plant[] = [
  {
    id: "1",
    family: "Lamiaceae",
    scientificName: "Mentha longifolia",
    localName: "Habak",
    partUsed: "Leaves",
    traditionalUse: "Digestive aid",
    phytochemicals: "Menthol, Pulegone",
    imppatId: "IMP00132",
    references: "Al-Yahya et al. (1990)",
    imageUrl: "https://images.unsplash.com/photo-1648036933917-762235e009c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW50JTIwbGVhdmVzJTIwcGxhbnR8ZW58MXx8fHwxNzc2NzA0MjA2fDA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: "2",
    family: "Burseraceae",
    scientificName: "Boswellia sacra",
    localName: "Luban",
    partUsed: "Resin",
    traditionalUse: "Anti-inflammatory, Asthma",
    phytochemicals: "Boswellic acids",
    imppatId: "IMP01455",
    references: "Al-Harrasi et al. (2012)",
    imageUrl: "https://images.unsplash.com/photo-1636396279298-021f7ec515e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmFua2luY2Vuc2UlMjByZXNpbnxlbnwxfHx8fDE3NzY3MDQyMTB8MA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: "3",
    family: "Asphodelaceae",
    scientificName: "Aloe vera",
    localName: "Sabar",
    partUsed: "Leaves, Gel",
    traditionalUse: "Skin burns, Wound healing",
    phytochemicals: "Aloin, Emodin",
    imppatId: "IMP00211",
    references: "Ghazanfar (1994)",
    imageUrl: "https://images.unsplash.com/photo-1684913127590-54e08d09a34b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbG9lJTIwdmVyYSUyMHBsYW50fGVufDF8fHx8MTc3NjcwNDIxMHww&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: "4",
    family: "Fabaceae",
    scientificName: "Senna alexandrina",
    localName: "Senna",
    partUsed: "Leaves",
    traditionalUse: "Laxative",
    phytochemicals: "Sennosides A & B",
    imppatId: "IMP02390",
    references: "Mothana et al. (2010)",
    imageUrl: "https://images.unsplash.com/photo-1596704179361-2b0e6e72b9a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib3RhbmljYWwlMjBsZWF2ZXN8ZW58MXx8fHwxNzc2NzA0MjEwfDA&ixlib=rb-4.1.0&q=80&w=1080", // using a placeholder botanical leaves since Unsplash didn't have Senna specifically just now
  },
  {
    id: "5",
    family: "Rhamnaceae",
    scientificName: "Ziziphus spina-christi",
    localName: "Sidr",
    partUsed: "Leaves, Fruit",
    traditionalUse: "Antimicrobial, Skin diseases",
    phytochemicals: "Christinin-A",
    imppatId: "IMP03412",
    references: "Adzu et al. (2001)",
    imageUrl: "https://images.unsplash.com/photo-1724099580945-46b1669d96db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqdWp1YmUlMjB0cmVlJTIweml6aXBodXN8ZW58MXx8fHwxNzc2NzA0MjM4fDA&ixlib=rb-4.1.0&q=80&w=1080",
  }
];