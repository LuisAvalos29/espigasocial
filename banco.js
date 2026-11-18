/* Banco de frases inicial de Espiga Social (versión sin IA).
   Marcadores que la app reemplaza: {producto} {nombre} {ciudad} {direccion} {whatsapp} {horario}
   Momento de los ganchos: "manana" (antes de 10), "mediodia" (10 a 14), "tarde" (después de 14), "*" (cualquiera) */
const BANCO_INICIAL = {
  ganchos: [
    { m: "manana", t: "☀️ ¡Buenos días, Macuspana! Ya estamos abiertos." },
    { m: "manana", t: "🌅 Arranca el día con todo lo del desayuno a la vuelta de tu casa." },
    { m: "manana", t: "☕ ¿Ya pensaste qué vas a desayunar hoy?" },
    { m: "manana", t: "🍳 Huevito, frijoles y tortilla calientita: el desayuno que nunca falla." },
    { m: "manana", t: "⏰ Antes de que empiece el ajetreo del día, pasa por lo que te falte." },
    { m: "manana", t: "🌽 Desde temprano, la máquina ya está echando tortillas." },
    { m: "manana", t: "🚶 De camino al trabajo o a dejar a los niños, aquí te queda de paso." },
    { m: "manana", t: "☀️ Buen día, vecino. Hoy también te esperamos con todo fresco." },
    { m: "mediodia", t: "🔥 ¡Ya salieron calientitas! Justo a tiempo para la comida." },
    { m: "mediodia", t: "🍽️ ¿Ya tienes las tortillas para la comida?" },
    { m: "mediodia", t: "⏳ Se acerca la hora de comer y en la mesa no pueden faltar las tortillas." },
    { m: "mediodia", t: "🌽 Recién hechas, con olor a maíz y todavía con vapor." },
    { m: "mediodia", t: "🥘 Tú pon el guisado, nosotros ponemos las tortillas." },
    { m: "mediodia", t: "😋 Hay comidas que sin tortilla simplemente no son lo mismo." },
    { m: "mediodia", t: "🏃 Antes de que se haga la fila, pasa por tu kilo." },
    { m: "mediodia", t: "🔥 Con este calor tabasqueño, mejor resuelve la comida en un solo lugar." },
    { m: "tarde", t: "🌇 ¡Todavía alcanzas! Te atendemos {horario}." },
    { m: "tarde", t: "🌙 ¿Ya tienes resuelta la cena?" },
    { m: "tarde", t: "🥤 Tarde de calor: algo fresquito y una botana nunca caen mal." },
    { m: "tarde", t: "🛒 Si se te olvidó algo para mañana, aquí lo encuentras." },
    { m: "tarde", t: "🌮 Para la cena: unos tacos, unas quesadillas o unas tostadas." },
    { m: "tarde", t: "⏰ Último llamado del día: pasa antes de que cerremos." },
    { m: "tarde", t: "🍞 Deja listo el desayuno de mañana desde hoy." },
    { m: "*", t: "🌽 En {nombre} hay mucho más que tortillas." },
    { m: "*", t: "📍 ¿Sabías que a la vuelta de tu casa encuentras esto?" },
    { m: "*", t: "💛 Comprar en tu colonia también es apoyar a Macuspana." },
    { m: "*", t: "✨ Hoy te presentamos uno de los productos que más nos piden." },
    { m: "*", t: "🛍️ Ahórrate la vuelta al centro: lo tienes aquí cerquita." },
    { m: "*", t: "👀 Mira lo que acaba de llegar a la tienda." },
    { m: "*", t: "🙌 Gracias a ti, vecino, que nos prefieres todos los días." },
    { m: "*", t: "📦 Por pieza, por caja, por kilo o por bulto: como lo necesites." },
    { m: "*", t: "🌽 Hechas con maíz, trabajo y mucho cariño." },
    { m: "*", t: "🏠 Lo de todos los días, en un solo lugar." },
    { m: "*", t: "📲 ¿Andas ocupado? Mándanos WhatsApp y te lo tenemos listo." },
    { m: "*", t: "⭐ Producto del día en {nombre}:" },
    { m: "*", t: "🧺 Haz tu mandado completo sin salir de la colonia." }
  ],

  cuerpos: {
    tortilla: [
      "Nuestras tortillas se hacen todos los días con maíz seleccionado. Suaves, calientitas y con el sabor de siempre.",
      "No hay comida tabasqueña completa sin tortilla: con frijol con puerco, con pejelagarto, con chirmol o con un buen huevito.",
      "Tortilla recién hecha, de la máquina a tu mesa. Pídela por kilo o por la cantidad que necesites.",
      "¿Fiesta, reunión o comida familiar? Pide tus tortillas con tiempo por WhatsApp y te las tenemos listas.",
      "Para tacos, para enchiladas, para tostadas o nomás con sal: la tortilla de maíz siempre cumple.",
      "Una tortilla calientita es de esos pequeños gustos de todos los días. Aquí te esperamos.",
      "Desde temprano estamos echando tortillas para que a tu mesa lleguen frescas y suavecitas.",
      "Si eres de los que prefieren la tortilla bien caliente, pasa a la hora de la comida y llévatela recién salida."
    ],
    huevo: [
      "Tenemos {producto} por pieza y por caja: fresco, para el desayuno de todos los días o para tu negocio.",
      "Un buen huevito a la mexicana, ranchero o con frijoles, con tortillas calientitas. Aquí tienes los dos.",
      "¿Tienes cocina económica o puesto de comida? Pregúntanos por {producto} por caja.",
      "El huevo nunca falta en la cocina tabasqueña. Llévate el tuyo junto con tus tortillas y resuelve en una sola vuelta."
    ],
    lacteos: [
      "Tenemos {producto} para el desayuno, el licuado de los niños o el cafecito de la tarde.",
      "Leche Lala entera y deslactosada, yogurt Lala y mantequilla Gloria sin sal: lo del refri, aquí cerquita.",
      "¿Vas a hacer pan, pastel o unos hot cakes? Aquí encuentras mantequilla Gloria sin sal y leche Lala.",
      "Queso de bola Edam El Gallo Azul: el clásico para las fiestas, para los antojos o para regalar.",
      "Para el licuado de la mañana: leche, plátano y listo. La leche Lala la tienes aquí."
    ],
    pan: [
      "Pan Bimbo y pastelitos Marinela para el lonche de los niños, el desayuno o el antojo de la tarde.",
      "¿Sándwiches para el recreo? Aquí tienes el pan Bimbo y lo que necesitas para prepararlos.",
      "Un cafecito con un pastelito Marinela es de esos gustos que alegran la tarde.",
      "Tenemos {producto} para que no tengas que ir hasta el súper. Lo del diario, a la vuelta."
    ],
    botanas: [
      "Sabritas, Barcel y sopas Nissin para el antojo, el partido o la reunión con los amigos.",
      "¿Se te antojó algo? Tenemos {producto} y más botanas para toda la familia.",
      "Para ver el partido, la película o la novela: una botana y un refresco bien frío.",
      "Sopas Nissin por caja: prácticas para la oficina, la escuela o cuando no da tiempo de cocinar."
    ],
    refrescos: [
      "Refrescos a precio de depósito: Coca-Cola, Pepsi, Arizona de lata y Chiva Cola de 600 ml.",
      "Con este calor, nada como un refresco bien frío. Tenemos {producto} y más marcas.",
      "¿Tienes reunión? Llévate tus refrescos a precio de depósito y ahorra.",
      "Horchata chontal, refrescos y bebidas para acompañar tu comida. Pregunta por las presentaciones.",
      "Trae tus envases y llévate tus refrescos a precio de depósito."
    ],
    granos: [
      "Azúcar, maíz Sinaloa y Campeche y frijol Michigan por kilo y por bulto. Ideal para tu casa o tu negocio.",
      "Tenemos {producto} por kilo y por bulto. Si compras para negocio o para tus animales, pregúntanos por WhatsApp.",
      "Cacao y cacahuate crudo por kilo, para tu pozol, tu chocolate o tus dulces caseros.",
      "¿Haces pozol en casa? Aquí encuentras el maíz y el cacao.",
      "Frijol Michigan por kilo y por bulto: para el frijol con puerco del lunes o para tu negocio de comida.",
      "Alimentos Campi para tus animales, por kilo y por bulto, aquí mismo en la colonia.",
      "Maíz de Sinaloa y de Campeche por kilo y por bulto. Pregunta por disponibilidad."
    ],
    despensa: [
      "Mayonesa McCormick, salsa San Luis y duraznos Los García y La Costeña: lo que le da el toque a tu comida.",
      "¿Ensalada de coditos, sándwiches o tostadas? Aquí tienes la mayonesa McCormick.",
      "Duraznos en almíbar para el postre de la familia o para tu pastel de tres leches.",
      "Un chorrito de salsa San Luis y cualquier taco sabe mejor.",
      "Tenemos {producto} para completar tu despensa sin salir de la colonia."
    ],
    hogar: [
      "Jabón Ariel, rollos de bolsa de varios tamaños y bolsas de carbón: lo de la casa y el negocio, aquí también.",
      "¿Carnita asada el fin de semana? Llévate tu bolsa de carbón, las tortillas y los refrescos en una sola vuelta.",
      "Rollos de bolsa de plástico de diferentes tamaños para tu negocio o tu casa. Pregunta por medidas.",
      "Tenemos {producto} para que resuelvas el mandado completo en un solo lugar."
    ],
    general: [
      "En {nombre} encuentras tortillas, abarrotes, lácteos, pan, botanas, refrescos y más. Todo en un solo lugar.",
      "Somos un negocio de aquí, de Macuspana. Cada compra que haces con nosotros se queda en la colonia.",
      "Atendemos {horario}. Si no puedes venir, mándanos WhatsApp y te lo tenemos listo.",
      "Por pieza, por caja, por kilo y por bulto. Si buscas algo en especial, pregúntanos.",
      "Gracias por seguir prefiriendo el comercio local. Aquí siempre te atendemos con gusto."
    ]
  },

  categorias: {
    tortilla: "Tortillas",
    huevo: "Huevo",
    lacteos: "Leche, yogurt, mantequilla y queso",
    pan: "Pan y pastelitos (Bimbo, Marinela)",
    botanas: "Botanas y sopas (Sabritas, Barcel, Nissin)",
    refrescos: "Refrescos y bebidas",
    granos: "Granos y semillas (azúcar, maíz, frijol, cacao, cacahuate, Campi)",
    despensa: "Despensa (mayonesa, salsa, duraznos)",
    hogar: "Hogar (jabón, bolsas, carbón)",
    general: "La tienda en general"
  },

  tagsCategoria: {
    tortilla: "#Tortillas #TortillaDeMaiz",
    huevo: "#Huevo",
    lacteos: "#Lala",
    pan: "#Bimbo #Marinela",
    botanas: "#Sabritas #Barcel",
    refrescos: "#Refrescos",
    granos: "#Abarrotes #PorBulto",
    despensa: "#Despensa",
    hogar: "#Hogar",
    general: "#Abarrotes"
  },

  /* Fechas especiales: desde/hasta en formato MM-DD (inclusive). "quincena" y "cuaresma" se calculan aparte. */
  fechas: [
    { id: "quincena", nombre: "Quincena", frases: [
      "💰 ¡Llegó la quincena! Buen momento para surtir tu despensa.",
      "💰 Es quincena: aprovecha para comprar por bulto o por caja y ahorrar en vueltas."
    ] },
    { id: "muertos", nombre: "Día de Muertos", desde: "10-25", hasta: "11-02", frases: [
      "🕯️ Para el altar y para la comida de estos días, aquí tienes lo que necesitas.",
      "🕯️ Se acerca el Día de Muertos: tortillas, cacao, azúcar y refrescos para tu ofrenda y tu familia."
    ] },
    { id: "guadalupe", nombre: "Día de la Virgen de Guadalupe", desde: "12-08", hasta: "12-12", frases: [
      "🌹 Para las reuniones y los rezos del 12 de diciembre, pide tus tortillas con tiempo."
    ] },
    { id: "navidad", nombre: "Navidad", desde: "12-13", hasta: "12-25", frases: [
      "🎄 Para la cena navideña: queso de bola, duraznos, refrescos y todo lo que te haga falta.",
      "🎄 Se acercan las posadas y la Navidad. Haz tu pedido por WhatsApp y evita las filas."
    ] },
    { id: "anonuevo", nombre: "Año Nuevo", desde: "12-26", hasta: "01-01", frases: [
      "🎆 Cierra el año con la mesa completa. Aquí tienes lo de la cena y el recalentado."
    ] },
    { id: "reyes", nombre: "Día de Reyes", desde: "01-03", hasta: "01-06", frases: [
      "👑 Para la rosca de Reyes: leche Lala bien fría y chocolatito con nuestro cacao."
    ] },
    { id: "candelaria", nombre: "Día de la Candelaria", desde: "01-28", hasta: "02-02", frases: [
      "🫔 ¿Te salió el muñeco? Para los tamales de la Candelaria, aquí tienes el maíz."
    ] },
    { id: "cuaresma", nombre: "Cuaresma", frases: [
      "🐟 En Cuaresma, las tortillas no pueden faltar para tus tacos de pescado y tus empanadas."
    ] },
    { id: "nino", nombre: "Día del Niño", desde: "04-27", hasta: "04-30", frases: [
      "🎈 Para festejar a los niños: pastelitos Marinela, botanas y refrescos."
    ] },
    { id: "mama", nombre: "Día de las Madres", desde: "05-06", hasta: "05-10", frases: [
      "💐 Para consentir a mamá en su día, que la comida corra por tu cuenta. Aquí tienes todo."
    ] },
    { id: "patrias", nombre: "Fiestas patrias", desde: "09-12", hasta: "09-16", frases: [
      "🇲🇽 ¡Viva México! Para la noche mexicana: tortillas, tostadas, refrescos y botanas."
    ] },
    { id: "feria", nombre: "Feria de Macuspana", desde: "06-28", hasta: "07-06", frases: [
      "🎡 ¡Es tiempo de feria en Macuspana! Antes o después del paseo, aquí te esperamos."
    ] },
    { id: "escuela", nombre: "Regreso a clases", desde: "08-20", hasta: "09-03", frases: [
      "🎒 Regreso a clases: para el lonche de los niños tenemos pan Bimbo, pastelitos y jugos."
    ] }
  ],

  cierres: [
    "📍 {direccion}\n📲 Pedidos por WhatsApp: {whatsapp}\n🕕 Abrimos {horario}",
    "📍 Visítanos: {direccion}\n📲 WhatsApp: {whatsapp}",
    "📲 Haz tu pedido por WhatsApp: {whatsapp}\n📍 {direccion}",
    "💚 ¡Gracias por apoyar el comercio local!\n📍 {direccion}\n📲 {whatsapp}",
    "📍 Estamos en {direccion}.\n📲 Escríbenos al {whatsapp} y te lo tenemos listo.",
    "🕕 Te atendemos {horario}.\n📍 {direccion}\n📲 WhatsApp: {whatsapp}"
  ],

  preguntas: [
    "¿Ustedes con qué acompañan sus tortillas?",
    "¿Cuál es su desayuno favorito de fin de semana?",
    "¿Qué guisado no puede faltar en su casa los lunes?",
    "¿Qué producto les gustaría encontrar aquí?",
    "¿Pozol con cacao o sin cacao? Cuéntennos.",
    "¿Tacos, quesadillas o tostadas para la cena de hoy?"
  ]
};

/* ===== Versión 2: frases por producto exacto =====
   cat = categoría a la que pertenece; claves = palabras para reconocerlo en el nombre que escribas;
   ganchos = primeras líneas propias del producto; frases = texto del producto. */
BANCO_INICIAL.version = 2;
BANCO_INICIAL.productos = {
  tortilla: { nombre: "Tortilla de maíz", cat: "tortilla", claves: ["tortilla"], tags: "#Tortillas #TortillaDeMaiz",
    ganchos: ["🔥 ¡Ya salieron calientitas!", "🌽 Tortillas recién hechas, todavía con vapor.", "🍽️ ¿Ya tienes las tortillas para la comida?"],
    frases: BANCO_INICIAL.cuerpos.tortilla.slice() },
  huevo: { nombre: "Huevo Calvario", cat: "huevo", claves: ["huevo", "calvario"], tags: "#Huevo #HuevoCalvario",
    ganchos: ["🍳 ¿Huevito para el desayuno?", "🥚 Huevo Calvario por pieza y por caja."],
    frases: BANCO_INICIAL.cuerpos.huevo.map(t => t.replace(/\{producto\}/g, "huevo Calvario")) },
  leche: { nombre: "Leche Lala", cat: "lacteos", claves: ["leche"], tags: "#Lala #Leche",
    ganchos: ["🥛 ¿Ya tienes leche para mañana?", "🥛 Leche Lala entera y deslactosada, bien fría."],
    frases: ["Tenemos leche Lala entera y deslactosada para el desayuno, el café o el licuado de los niños.", "Para el licuado de la mañana: leche, plátano y listo. La leche Lala la tienes aquí cerquita.", "¿Te cae pesada la leche? Tenemos leche Lala deslactosada.", "Que no falte la leche en el refri: pasa por la tuya junto con tus tortillas."] },
  yogurt: { nombre: "Yogurt Lala", cat: "lacteos", claves: ["yogurt", "yogur"], tags: "#Lala #Yogurt",
    ganchos: ["🥄 Un yogurt fresquito para el calor.", "🎒 ¿Qué le mandas de lonche a los niños?"],
    frases: ["Yogurt Lala para el lonche de los niños, el desayuno rápido o el antojo de la tarde.", "Con este calor, un yogurt bien frío cae de maravilla. Tenemos yogurt Lala.", "Yogurt con fruta y granola: un desayuno rápido para los días con prisa. El yogurt Lala lo tienes aquí."] },
  mantequilla: { nombre: "Mantequilla Gloria sin sal", cat: "lacteos", claves: ["mantequilla", "gloria"], tags: "#MantequillaGloria",
    ganchos: ["🧈 ¿Vas a hornear este fin de semana?", "🥞 Hot cakes con mantequilla: el desayuno favorito de los niños."],
    frases: ["Mantequilla Gloria sin sal, ideal para panes, pasteles, galletas y hot cakes.", "¿Receta de pastel o de galletas? La mantequilla Gloria sin sal la encuentras aquí.", "Unos hot cakes con mantequilla y miel para el desayuno del domingo. Aquí tienes la mantequilla Gloria."] },
  queso: { nombre: "Queso de bola Edam El Gallo Azul", cat: "lacteos", claves: ["queso", "bola", "edam", "gallo"], tags: "#QuesoDeBola #QuesoEdam",
    ganchos: ["🧀 ¡Tenemos queso de bola!", "🧀 El clásico de las fiestas: queso de bola El Gallo Azul."],
    frases: ["Queso de bola Edam El Gallo Azul, el clásico para las fiestas, los antojos o para regalar.", "Queso de bola relleno, en botanas o en tu cena especial: aquí lo tienes.", "¿Reunión familiar? Un queso de bola El Gallo Azul siempre luce en la mesa."] },
  pan_bimbo: { nombre: "Pan Bimbo", cat: "pan", claves: ["bimbo", "pan "], tags: "#Bimbo",
    ganchos: ["🍞 ¿Sándwiches para el recreo?", "🍞 Pan Bimbo para el desayuno de mañana."],
    frases: ["Pan Bimbo para los sándwiches, las tortas o el desayuno de todos los días.", "¿Sándwiches para el lonche? Pan Bimbo, mayonesa y lo que necesitas, todo aquí.", "Pan tostado con mantequilla y un cafecito: el desayuno sencillo que nunca falla. Pan Bimbo aquí cerquita."] },
  marinela: { nombre: "Pastelitos Marinela", cat: "pan", claves: ["marinela", "gansito", "pinguino", "pingüino", "submarino", "principe", "príncipe"], tags: "#Marinela",
    ganchos: ["😋 ¿Se te antojó algo dulce?", "☕ Un cafecito pide un pastelito."],
    frases: ["Pastelitos Marinela para el lonche de los niños o el antojo de la tarde.", "Un cafecito con un pastelito Marinela es de esos gustos que alegran el día.", "¿Cuál es tu favorito de Marinela? Pásate por el tuyo."] },
  sabritas: { nombre: "Sabritas", cat: "botanas", claves: ["sabritas", "ruffles", "doritos", "cheetos", "tostitos"], tags: "#Sabritas",
    ganchos: ["🍿 ¿Partido, película o reunión? Que no falte la botana.", "😋 Antojo de botana a la vista."],
    frases: ["Tenemos Sabritas para el antojo, el partido o la reunión con los amigos.", "Unas Sabritas y un refresco bien frío: el combo perfecto para la tarde.", "Botana para toda la familia: Sabritas en varias presentaciones."] },
  barcel: { nombre: "Barcel", cat: "botanas", claves: ["barcel", "takis", "runners", "chips"], tags: "#Barcel",
    ganchos: ["🌶️ ¿Antojo de algo enchilosito?", "🍿 Botanas Barcel para el antojo."],
    frases: ["Botanas Barcel para los que les gusta el picante y el crujiente.", "Takis, Chips y más botanas Barcel para la tarde de película.", "¿Con limón y salsa? Las botanas Barcel siempre caen bien."] },
  nissin: { nombre: "Sopa Nissin", cat: "botanas", claves: ["nissin", "maruchan", "sopa"], tags: "#Nissin",
    ganchos: ["🍜 ¿Sin tiempo para cocinar?", "🍜 Sopas Nissin por caja."],
    frases: ["Sopas Nissin: listas en minutos para la oficina, la escuela o cuando no da tiempo de cocinar.", "Tenemos sopas Nissin por pieza y por caja. Pregúntanos por WhatsApp.", "Una sopa Nissin con limón y salsa: el antojo rápido de la noche."] },
  cocacola: { nombre: "Coca-Cola", cat: "refrescos", claves: ["coca"], tags: "#CocaCola",
    ganchos: ["🥤 ¿Una Coca bien fría para la comida?", "🥤 Coca-Cola a precio de depósito."],
    frases: ["Coca-Cola a precio de depósito: trae tu envase y llévate la tuya.", "La comida sabe mejor con una Coca-Cola bien fría. Aquí la tienes a precio de depósito.", "¿Reunión o comida familiar? Llévate tus Coca-Colas a precio de depósito y ahorra."] },
  pepsi: { nombre: "Pepsi", cat: "refrescos", claves: ["pepsi"], tags: "#Pepsi",
    ganchos: ["🥤 ¿Team Pepsi? Aquí la tienes.", "🥤 Pepsi a precio de depósito."],
    frases: ["Pepsi a precio de depósito: trae tu envase y ahorra.", "Para los que prefieren Pepsi: aquí la encuentras bien fría.", "Una Pepsi para acompañar los tacos de la cena."] },
  arizona: { nombre: "Arizona de lata", cat: "refrescos", claves: ["arizona"], tags: "#Arizona",
    ganchos: ["🧃 Arizona de lata para el calor.", "🧊 Algo fresquito para la tarde."],
    frases: ["Arizona de lata, bien fría, para pasar el calor de la tarde.", "¿Algo diferente para tomar? Tenemos Arizona de lata.", "Para el camino, la escuela o el trabajo: una Arizona de lata."] },
  chiva: { nombre: "Chiva Cola 600 ml", cat: "refrescos", claves: ["chiva"], tags: "#ChivaCola #Tabasco",
    ganchos: ["🥤 La de aquí: Chiva Cola.", "🥤 Chiva Cola de 600 ml bien fría."],
    frases: ["Chiva Cola de 600 ml, el refresco de la región, a precio de depósito.", "Pocas cosas tan tabasqueñas como una Chiva Cola bien fría con la comida.", "Chiva Cola de 600 ml: trae tu envase y llévatela a precio de depósito."] },
  horchata: { nombre: "Horchata chontal", cat: "refrescos", claves: ["horchata", "chontal"], tags: "#Horchata",
    ganchos: ["🥛 ¿Agüita de horchata para la comida?", "🧊 Horchata chontal para el calor."],
    frases: ["Horchata chontal para preparar tu agua fresca de la comida.", "Con este calor, un vaso de horchata bien fría es lo mejor. Aquí tienes la horchata chontal.", "Agua de horchata para acompañar los tacos y los antojitos."] },
  azucar: { nombre: "Azúcar", cat: "granos", claves: ["azucar", "azúcar"], tags: "#Azucar #PorBulto",
    ganchos: ["🍬 Azúcar por kilo y por bulto.", "☕ ¿Ya se te acabó el azúcar?"],
    frases: ["Azúcar por kilo y por bulto, para tu casa, tu puesto o tu negocio de aguas y postres.", "Que no te falte azúcar para el café, el pozol o las aguas frescas.", "¿Tienes negocio de postres, aguas o dulces? Pregúntanos por el azúcar por bulto."] },
  maiz: { nombre: "Maíz (Sinaloa y Campeche)", cat: "granos", claves: ["maiz", "maíz", "sinaloa", "campeche"], tags: "#Maiz #PorBulto",
    ganchos: ["🌽 Maíz de Sinaloa y de Campeche.", "🌽 ¿Haces pozol o tamales en casa?"],
    frases: ["Maíz de Sinaloa y de Campeche por kilo y por bulto.", "Para tu pozol, tus tamales o tus animales: maíz por kilo y por bulto.", "¿Compras maíz para negocio o para la granja? Pregúntanos por WhatsApp."] },
  frijol: { nombre: "Frijol Michigan", cat: "granos", claves: ["frijol"], tags: "#Frijol #PorBulto",
    ganchos: ["🫘 ¿Frijol con puerco el lunes?", "🫘 Frijol Michigan por kilo y por bulto."],
    frases: ["Frijol Michigan por kilo y por bulto: para el frijol con puerco del lunes o tu negocio de comida.", "Unos frijolitos de la olla con tortilla calientita: comida de casa. Aquí tienes el frijol Michigan.", "¿Cocina económica o puesto? Pregúntanos por frijol por bulto."] },
  cacao: { nombre: "Cacao", cat: "granos", claves: ["cacao"], tags: "#Cacao #Pozol #Tabasco",
    ganchos: ["🍫 Cacao para tu pozol.", "🍫 ¿Pozol con cacao? ¡Claro que sí!"],
    frases: ["Cacao por kilo para tu pozol, tu chocolate o tus dulces caseros.", "No hay pozol tabasqueño como el que lleva cacao. Aquí lo tienes por kilo.", "Chocolate de agua o pozol de cacao: el sabor de Tabasco empieza aquí."] },
  cacahuate: { nombre: "Cacahuate crudo", cat: "granos", claves: ["cacahuate"], tags: "#Cacahuate",
    ganchos: ["🥜 Cacahuate crudo por kilo.", "🥜 ¿Cacahuates tostados hechos en casa?"],
    frases: ["Cacahuate crudo por kilo para tostar, garapiñar o preparar tu salsa de cacahuate.", "Cacahuates tostados con limón y chile: la botana casera más rica. Aquí tienes el cacahuate crudo.", "¿Haces dulces o garapiñados para vender? Pregúntanos por cacahuate por kilo."] },
  campi: { nombre: "Alimentos Campi", cat: "granos", claves: ["campi", "alimento"], tags: "#Campi",
    ganchos: ["🐔 Alimento Campi para tus animales.", "🐷 ¿Tienes animalitos en casa o en el rancho?"],
    frases: ["Alimentos Campi por kilo y por bulto para tus animales, aquí mismo en la colonia.", "Ahórrate la vuelta: el alimento Campi para tus animales lo tienes aquí cerquita.", "Pregúntanos por WhatsApp qué alimentos Campi tenemos disponibles por bulto."] },
  mayonesa: { nombre: "Mayonesa McCormick", cat: "despensa", claves: ["mayonesa", "mccormick"], tags: "#McCormick #Mayonesa",
    ganchos: ["🥪 ¿Sándwiches, tortas o ensalada? Que no falte la mayonesa.", "🥗 Ensalada de coditos sin mayonesa no es ensalada."],
    frases: ["Mayonesa McCormick para tus sándwiches, tortas, ensaladas y tostadas.", "¿Ensalada de coditos o de papa para la comida? Aquí tienes la mayonesa McCormick.", "Una torta sin mayonesa no es lo mismo. Pasa por tu McCormick.", "Elotes con mayonesa, queso y chile: el antojo de la tarde. La mayonesa McCormick la encuentras aquí."] },
  salsa: { nombre: "Salsa San Luis", cat: "despensa", claves: ["salsa", "san luis"], tags: "#SalsaSanLuis",
    ganchos: ["🌶️ Ponle sabor con salsa San Luis.", "🌶️ ¿Tacos sin salsa? ¡Nunca!"],
    frases: ["Un chorrito de salsa San Luis y cualquier taco sabe mejor.", "Salsa San Luis para tus tacos, tus botanas y tus sopas. Aquí la tienes.", "Para las papitas, los cacahuates o las tostadas: salsa San Luis."] },
  duraznos: { nombre: "Duraznos en almíbar", cat: "despensa", claves: ["durazno", "garcia", "garcía", "costeña", "costena"], tags: "#Duraznos",
    ganchos: ["🍑 ¿Postre para la familia?", "🍰 ¿Pastel de tres leches con duraznos?"],
    frases: ["Duraznos en almíbar Los García y La Costeña para el postre de la familia.", "Pastel de tres leches con duraznos: el favorito de las fiestas. Aquí tienes los duraznos.", "Duraznos con crema o con gelatina: un postre fácil para la comida del domingo."] },
  ariel: { nombre: "Jabón Ariel", cat: "hogar", claves: ["ariel", "jabon", "jabón", "detergente"], tags: "#Ariel",
    ganchos: ["🧺 ¿Día de lavar ropa?", "🧼 Jabón Ariel aquí cerquita."],
    frases: ["Jabón Ariel para dejar tu ropa limpia. Llévatelo junto con tu mandado.", "¿Se te acabó el jabón? No vayas hasta el centro: aquí tienes Ariel.", "Ropa limpia sin dar vueltas: jabón Ariel en {nombre}."] },
  bolsas: { nombre: "Rollos de bolsa", cat: "hogar", claves: ["bolsa", "rollo"], tags: "#Bolsas #Negocio",
    ganchos: ["🛍️ ¿Tienes negocio? Tenemos rollos de bolsa.", "🛍️ Rollos de bolsa de varios tamaños."],
    frases: ["Rollos de bolsa de plástico de diferentes tamaños para tu negocio o tu casa.", "¿Puesto, tiendita o cocina económica? Pregúntanos por las medidas de los rollos de bolsa.", "Bolsas para tortillas, para mandado o para tu negocio: pregunta por tamaños."] },
  carbon: { nombre: "Bolsa de carbón", cat: "hogar", claves: ["carbon", "carbón"], tags: "#Carbon #CarneAsada",
    ganchos: ["🔥 ¿Carnita asada este fin de semana?", "🔥 Bolsa de carbón lista para el asador."],
    frases: ["¿Carnita asada? Llévate tu bolsa de carbón, las tortillas y los refrescos en una sola vuelta.", "Bolsa de carbón para el asador del fin de semana. Aquí la tienes.", "Asada sin carbón no hay. Pasa por tu bolsa y de una vez por las tortillas."] },
  tienda: { nombre: "La tienda en general", cat: "general", claves: ["tienda", "local", "negocio", "fachada"], tags: "#Abarrotes",
    ganchos: ["🏠 Lo de todos los días, en un solo lugar.", "🌽 En {nombre} hay mucho más que tortillas."],
    frases: BANCO_INICIAL.cuerpos.general.slice() }
};
