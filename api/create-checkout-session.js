const PRODUCTS = {

  "slow-rise-butter": {

    name: "Slow Rise Butter",

    price: 6

  },

  "vaseline-butter": {

    name: "Vaseline Butter",

    price: 6

  },

  "crunchy-butter": {

    name: "Crunchy Butter",

    price: 6,

    colors: ["Blue", "Pink"]

  },

  "cheese": {

    name: "Cheese",

    price: 4

  },

  "potato": {

    name: "Potato",

    price: 6

  },

  "peach": {

    name: "Peach",

    price: 9

  },

  "crunchy-toast": {

    name: "Crunchy Toast",

    price: 6

  },

  "needoh-cloud": {

    name: "Needoh Cloud",

    price: 8

  },

  "giant-strawberry": {

    name: "Giant Strawberry",

    price: 9

  },

  "slushy-apple": {

    name: "Slushy Apple",

    price: 6,

    colors: ["Red", "Green"]

  },

  "duck": {

    name: "Duck",

    price: 6,

    colors: ["Pink", "Blue", "Orange", "Purple"]

  },

  "crunchy-soap": {

    name: "Crunchy Soap",

    price: 6

  },

  "needoh": {

    name: "Needoh",

    price: 8,

    colors: ["Blue", "Pink", "Purple"]

  },

  "needoh-jellyfish": {

    name: "Needoh Jellyfish",

    price: 8,

    colors: ["Blue", "Pink", "Purple"]

  },

  "needoh-cake": {

    name: "Needoh Cake",

    price: 8

  },

  "needoh-ice-cream": {

    name: "Needoh Ice Cream",

    price: 8,

    colors: ["Blue", "Pink", "Orange"]

  },

  "bear": {

    name: "Bear",

    price: 3,

    colors: ["Pink", "Blue", "Orange", "Purple"]

  },

  "coconut-oil-ball": {

    name: "Coconut Oil Ball",

    price: 5,

    colors: ["Pink", "Yellow", "Blue", "Green"]

  },

  "hamster-taba": {

    name: "Hamster Taba",

    price: 6,

    colors: ["Yellow", "White"]

  },

  "souffle-taba": {

    name: "Soufflé Taba",

    price: 7

  }

};

/*

  COUNTRY → CURRENCY ALIASES

*/

const ALIASES = {

  "united states": "usd",

  "usa": "usd",

  "us": "usd",

  "singapore": "sgd",

  "thailand": "thb",

  "united kingdom": "gbp",

  "uk": "gbp",

  "great britain": "gbp",

  "australia": "aud",

  "canada": "cad",

  "japan": "jpy",

  "china": "cny",

  "south korea": "krw",

  "korea": "krw",

  "malaysia": "myr",

  "indonesia": "idr",

  "philippines": "php",

  "india": "inr",

  "new zealand": "nzd",

  "hong kong": "hkd",

  "taiwan": "twd"

};

/*

  SPECIAL COUNTRIES

*/

const COUNTRY_CURRENCY = {

  USA: "usd",

  Singapore: "sgd",

  Thailand: "thb",

  UK: "gbp"

};

/*

  CURRENCIES WE ALLOW FOR CHECKOUT

*/

const SUPPORTED = new Set([

  "usd",

  "sgd",

  "thb",

  "gbp",

  "eur",

  "jpy",

  "krw",

  "cny",

  "hkd",

  "twd",

  "myr",

  "idr",

  "php",

  "aud",

  "nzd",

  "cad",

  "inr",

  "vnd",

  "chf",

  "sek",

  "nok",

  "dkk",

  "pln",

  "mxn",

  "brl",

  "zar",

  "aed",

  "sar",

  "qar",

  "ils",

  "try"

]);

/*

  Currencies without decimal minor units

*/

const ZERO_DECIMAL = new Set([

  "jpy",

  "krw",

  "vnd"

]);

/*

  FIND THE COUNTRY'S CURRENCY

*/

async function getCurrency(country) {

  const key = String(country || "").trim();

  if (!key) {

    throw new Error(

      "Please provide your country."

    );

  }

  if (COUNTRY_CURRENCY[key]) {

    return COUNTRY_CURRENCY[key];

  }

  const alias =

    ALIASES[key.toLowerCase()];

  if (alias) {

    return alias;

  }

  /*

    For countries not listed above,

    ask REST Countries for the currency.

  */

  const response = await fetch(

    "https://restcountries.com/v3.1/name/" +

      encodeURIComponent(key) +

      "?fields=currencies"

  );

  if (!response.ok) {

    throw new Error(

      "We could not find that country's currency."

    );

  }

  const data =

    await response.json();

  const currencies =

    data?.[0]?.currencies

      ? Object.keys(data[0].currencies)

      : [];

  if (!currencies.length) {

    throw new Error(

      "We could not find that country's currency."

    );

  }

  return currencies[0].toLowerCase();

}

/*

  GET USD EXCHANGE RATE

*/

async function getRate(currency) {

  /*

    Your special rules:

    USA:

    $6 USD = $6 USD

    Singapore:

    $6 USD = S$6 SGD

  */

  if (

    currency === "usd" ||

    currency === "sgd"

  ) {

    return 1;

  }

  const response = await fetch(

    "https://open.er-api.com/v6/latest/USD"

  );

  if (!response.ok) {

    throw new Error(

      "Currency conversion is temporarily unavailable."

    );

  }

  const data =

    await response.json();

  const rate = Number(

    data?.rates?.[

      currency.toUpperCase()

    ]

  );

  if (

    !Number.isFinite(rate) ||

    rate <= 0

  ) {

    throw new Error(

      "That currency is not supported for checkout."

    );

  }

  return rate;

}

/*

  VERCEL API

*/

module.exports = async (req, res) => {

  /*

    🌎 GLOBAL WEBSITE ACCESS

    Allows the GitHub Pages website,

    Vercel website, and custom domain

    to call this API.

  */

  res.setHeader(

    "Access-Control-Allow-Origin",

    "*"

  );

  res.setHeader(

    "Access-Control-Allow-Methods",

    "POST, OPTIONS"

  );

  res.setHeader(

    "Access-Control-Allow-Headers",

    "Content-Type"

  );

  /*

    Browser preflight request

  */

  if (req.method === "OPTIONS") {

    return res.status(200).end();

  }

  /*

    Only POST is allowed

  */

  if (req.method !== "POST") {

    return res.status(405).json({

      error: "Method not allowed."

    });

  }

  try {

    /*

      Stripe secret key stays ONLY

      inside Vercel environment variables.

    */

    if (!process.env.STRIPE_SECRET_KEY) {

      throw new Error(

        "Stripe is not connected yet."

      );

    }

    const body =

      req.body || {};

    const country =

      body.country;

    const address =

      body.address;

    const cart =

      Array.isArray(body.items)

        ? body.items

        : body.cart;

    /*

      Check the customer's information

    */

    if (

      !country ||

      !address ||

      !Array.isArray(cart) ||

      !cart.length

    ) {

      return res.status(400).json({

        error:

          "Please provide your country, address, and cart."

      });

    }

    /*

      Find customer's currency

    */

    const currency =

      await getCurrency(country);

    /*

      Make sure Stripe supports

      this currency for our checkout.

    */

    if (!SUPPORTED.has(currency)) {

      throw new Error(

        "That currency is not supported for checkout."

      );

    }

    /*

      Get current USD exchange rate

    */

    const rate =

      await getRate(currency);

    /*

      Build Stripe Checkout request

    */

    const params =

      new URLSearchParams();

    params.set(

      "mode",

      "payment"

    );

    /*

      Customer returns here after payment

    */

    params.set(

      "success_url",

      "https://squishymart.vercel.app/?payment=success"

    );

    params.set(

      "cancel_url",

      "https://squishymart.vercel.app/?payment=cancelled"

    );

    /*

      Stripe creates a customer

    */

    params.set(

      "customer_creation",

      "always"

    );

    /*

      Save order information in Stripe

    */

    params.set(

      "metadata[country]",

      String(country).slice(0, 500)

    );

    params.set(

      "metadata[currency]",

      currency

    );

    params.set(

      "metadata[address]",

      JSON.stringify(address).slice(0, 500)

    );

    /*

      Add every cart item

    */

    let index = 0;

    for (const item of cart) {

      const product =

        PRODUCTS[

          String(item.productId)

        ];

      /*

        Make sure the product actually exists

      */

      if (!product) {

        throw new Error(

          "One of the products in your cart is unavailable."

        );

      }

      /*

        Limit quantity

      */

      const quantity =

        Math.max(

          1,

          Math.min(

            99,

            Number(item.quantity) || 1

          )

        );

      /*

        Check colors

      */

      if (

        product.colors &&

        !product.colors.includes(

          item.color

        )

      ) {

        throw new Error(

          "Please choose a valid color."

        );

      }

      /*

        Convert USD price to

        customer's currency.

        Example:

        USD $6

        Singapore → S$6

        Thailand → ฿...

        UK → £...

      */

      const amount =

        Math.round(

          product.price *

            rate *

            (

              ZERO_DECIMAL.has(

                currency

              )

                ? 1

                : 100

            )

        );

      /*

        Put color into product name

      */

      const name =

        product.name +

        (

          item.color

            ? " - " + item.color

            : ""

        );

      /*

        Stripe line item

      */

      params.set(

        `line_items[${index}][price_data][currency]`,

        currency

      );

      params.set(

        `line_items[${index}][price_data][unit_amount]`,

        String(amount)

      );

      params.set(

        `line_items[${index}][price_data][product_data][name]`,

        name

      );

      params.set(

        `line_items[${index}][quantity]`,

        String(quantity)

      );

      index++;

    }

    /*

      Send secure request to Stripe

    */

    const stripeResponse =

      await fetch(

        "https://api.stripe.com/v1/checkout/sessions",

        {

          method: "POST",

          headers: {

            Authorization:

              "Bearer " +

              process.env.STRIPE_SECRET_KEY,

            "Content-Type":

              "application/x-www-form-urlencoded"

          },

          body: params

        }

      );

    const stripeData =

      await stripeResponse.json();

    /*

      Stripe error

    */

    if (!stripeResponse.ok) {

      throw new Error(

        stripeData?.error?.message ||

        "Stripe could not start checkout."

      );

    }

    /*

      Send Stripe Checkout URL

      back to your website.

    */

    return res.status(200).json({

      url: stripeData.url

    });

  } catch (error) {

    console.error(

      "Checkout error:",

      error

    );

    /*

      Send the real error back

      so your website can display it.

    */

    return res.status(500).json({

      error:

        error?.message ||

        "Payment could not be started."

    });

  }

};
