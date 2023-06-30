import React, {useState, useEffect} from 'react';
import {
  useExtensionApi,
  render,
  Banner,
  BlockStack,
  useBuyerJourneyIntercept,
  useCartLines,
  useExtensionCapability,
  useTranslate,
} from '@shopify/checkout-ui-extensions-react';

render('Checkout::Dynamic::Render', () => <App />);

function App() {
  const {extensionPoint} = useExtensionApi();
  const { query } = useExtensionApi();

  const translate = useTranslate();

  const [validationError, setValidationError] = useState("");
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  const canBlockProgress = useExtensionCapability("block_progress");
  const label = canBlockProgress ? "LIMIT QTY" : "NO LIMIT";

  const cartLines = useCartLines();

  let qty = 0;
  let id = "";

  // Get max qty product from cart
  for (const cartLine of cartLines) {
    if (cartLine.quantity > qty) {
      qty = cartLine.quantity;
      id = cartLine.merchandise.product.id;
    }
  }

  // On initial load, fetch the product metafield
  useEffect(() => {
    // Set the loading state to show some UI if you're waiting
    setLoading(true);

    // Use `query` api method to send graphql queries to the Storefront API
    query(
      `query {
        product(id: "${id}") {
          id
          title
          metafield(namespace: "custom", key: "max_quantity_per_checkout") {
            value
          }
        }
      }`
    )
    .then(({data}) => {
      // Set the `product` object so that you can reference the items
      setProduct(data.product);
    })
    .catch((error) => console.error(error))
    .finally(() => setLoading(false));
  }, []);
  
  console.log(`qty: ${qty}`);
  console.log(`ID: ${id}`);
  console.log(`Product title: ${product?.title}`);
  console.log(`Product max qty: ${product?.metafield.value}`);

  const max_qty = (product ? product.metafield.value : 0);
  console.log(`max qty: ${max_qty}`);

  // Use the `buyerJourney` intercept to conditionally block checkout progress
  // The ability to block checkout progress isn't guaranteed.
  // Refer to the "Check for the ability to block checkout progress" section for more information.
  useBuyerJourneyIntercept(({ canBlockProgress }) => {

    // NOT_FOR_SALE
    if (canBlockProgress && !isForSale()) {
      return {
        behavior: "block",
        reason: `Cart contains NOT FOR SALE item(s)`,
        perform: (result) => {
          // If progress can be blocked, then set a validation error on the custom field
          if (result.behavior === "block") {
            setValidationError(`Cart contains NOT FOR SALE item(s)`);
          }
        },
      };
    }
    // Qty limit
    if (canBlockProgress && !isQtyOK()) {
      return {
        behavior: "block",
        reason: `Qty check failed`,
        perform: (result) => {
          // If progress can be blocked, then set a validation error on the custom field
          if (result.behavior === "block") {
            setValidationError(`TOO MANY ITEMS IN CART`);
          }
        },
      };
    }
    // OK to proceed
    return {
      behavior: "allow",
      perform: () => {
        // Ensure any errors are hidden
        setValidationError("");
      },
    };
  });

  function isQtyOK() {
    return qty <= max_qty;
  }
  function isForSale() {
    return max_qty > 0;
  }

  return (
    <BlockStack>
      <Banner title="buyer-journey-qty">
        {translate('welcome', {extensionPoint})} {label}
      </Banner>

      {!canBlockProgress && (
        <Banner status="critical">
          QTY BLOCKING FEATURE IS DISABLED!!
        </Banner>
      )}

      {validationError !== "" && (
        <Banner status="critical">
          {validationError}
        </Banner>
      )}

    </BlockStack>
  );
}