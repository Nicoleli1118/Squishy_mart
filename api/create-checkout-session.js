const PRODUCTS = {

  1: { name: "Slow Rise Butter", price: 6 },

  2: { name: "Vaseline Butter", price: 6 },

  3: { name: "Crunchy Butter", price: 6, colors: ["Blue","Pink"] },

  4: { name: "Cheese", price: 4 },

  5: { name: "Potato", price: 6 },

  6: { name: "Peach", price: 9 },

  7: { name: "Crunchy Toast", price: 6 },

  8: { name: "Needoh Cloud", price: 8 },

  9: { name: "Giant Strawberry", price: 9 },

  10: { name: "Slushy Apple", price: 6, colors: ["Red","Green"] },

  11: { name: "Duck", price: 6, colors: ["Pink","Blue","Orange","Purple"] },

  12: { name: "Crunchy Soap", price: 6 },

  13: { name: "Needoh", price: 8, colors: ["Blue","Pink","Purple"] },

  14: { name: "Needoh Jellyfish", price: 8, colors: ["Blue","Pink","Purple"] },

  15: { name: "Needoh Cake", price: 8 },

  16: { name: "Needoh Ice Cream", price: 8, colors: ["Blue","Pink","Orange"] },

  17: { name: "Bear", price: 3, colors: ["Pink","Blue","Orange","Purple"] }

};

const COUNTRY_CURRENCY = {

  USA: "usd",

  Singapore: "sgd",

  Thailand: "thb",

  UK: "gbp"

};

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

  "malaysia": "myr",

  "indonesia": "idr",

  "philippines": "php",

  "india": "inr",

  "new zealand": "nzd",

  "hong kong": "hkd",

  "taiwan": "twd"

};

const SUPPORTED = new Set([

  "usd","sgd","thb","gbp","eur","jpy","krw","cny","hkd","twd",

  "myr","idr","php","aud","nzd","cad","inr","vnd","chf","sek",

  "nok","dkk","pln","mxn","brl","zar","aed","sar","qar","ils","try"

]);

async function getCurrency(country) {

  const key = String(country || "").trim();

  if (COUNTRY_CURRENCY[key]) {

    return COUNTRY_CURRENCY[key];

  }

  const alias = ALIASES[key.toLowerCase()];

  if (alias) return alias;

  const response = await fetch(

    "https://restcountries.com/v3.1/name/" +

    encodeURIComponent(key) +

    "?fields=currencies"

  );

  if (!response.ok) {

    throw new Error("We could not find that country's currency.");

  }

  const data = await response.json();

  const currencies = data?.[0]?.currencies

    ? Object.keys(data[0].currencies)

    : [];

  if (!currencies[0]) {

    throw new Error("We could not find that country's currency.");

  }

  return currencies[0].toLowerCase();

}

async function getRate(currency) {

  if (currency === "usd" || currency === "sgd") {

    return 1;

  }

  const response = await fetch(

    "https://open.er-api.com/v6/latest/USD"

  );

  if (!response.ok) {

    throw new Error("Currency conversion is temporarily unavailable.");

  }

  const data = await response.json();

  const rate = Number(data?.rates?.[currency.toUpperCase()]);

  if (!Number.isFinite(rate) || rate <= 0) {

    throw new Error("That currency is not supported for checkout.");

  }

  return rate;

}

module.exports = async (req, res) => {

  if (req.method !== "POST") {

    return res.status(405).json({

      error: "Method not allowed."

    });

  }

  try {

    if (!process.env.STRIPE_SECRET_KEY) {

      throw new Error("Stripe is not connected yet.");

    }

    const { country, address, cart } = req.body || {};

    if (!country || !address || !Array.isArray(cart) || !cart.length) {

      return res.status(400).json({

        error: "Please provide your country, address, and cart."

      });

    }

    const currency = await getCurrency(country);

    if (!SUPPORTED.has(currency)) {

      throw new Error("That currency is not supported for checkout.");

    }

    const rate = await getRate(currency);

    const params = new URLSearchParams();

    params.set("mode", "payment");

    params.set(

      "success_url",

      "https://squishymart.vercel.app/?payment=success"

    );

    params.set(

      "cancel_url",

      "https://squishymart.vercel.app/?payment=cancelled"

    );

    params.set("customer_creation", "always");

    params.set("metadata[country]", String(country).slice(0, 500));

    params.set("metadata[currency]", currency);

    params.set("metadata[address]", String(address).slice(0, 500));

    let index = 0;

    for (const item of cart) {

      const product = PRODUCTS[Number(item.productId)];

      if (!product) {

        throw new Error("One of the products in your cart is unavailable.");

      }

      const quantity = Math.max(

        1,

        Math.min(99, Number(item.quantity) || 1)

      );

      if (product.colors && !product.colors.includes(item.color)) {

        throw new Error("Please choose a valid color.");

      }

      const unitAmount = Math.round(

        product.price * rate * 100

      );

      const name =

        product.name +

        (item.color ? " - " + item.color : "");

      params.set(

        `line_items[${index}][price_data][currency]`,

        currency

      );

      params.set(

        `line_items[${index}][price_data][unit_amount]`,

        String(unitAmount)

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

    const stripeResponse = await fetch(

      "https://api.stripe.com/v1/checkout/sessions",

      {

        method: "POST",

        headers: {

          "Authorization":

            "Bearer " + process.env.STRIPE_SECRET_KEY,

          "Content-Type":

            "application/x-www-form-urlencoded"

        },

        body: params

      }

    );

    const stripeData = await stripeResponse.json();

    if (!stripeResponse.ok) {

      throw new Error(

        stripeData?.error?.message ||

        "Stripe could not start checkout."

      );

    }

    return res.status(200).json({

      url: stripeData.url

    });

  } catch (error) {

    return res.status(500).json({

      error:

        error.message ||

        "Payment could not be started."

    });

  }

};
