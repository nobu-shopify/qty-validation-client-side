import React, {useState} from 'react';
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
  const translate = useTranslate();

  const [validationError, setValidationError] = useState("");

  const canBlockProgress = useExtensionCapability("block_progress");
  const label = canBlockProgress ? "LIMIT QTY" : "NO LIMIT";

  const cartLines = useCartLines();

  let qty = 0;
  let not_for_sale = false;
  for (const cartLine of cartLines) {
    if (cartLine.quantity > qty) {
      qty = cartLine.quantity;
    }
    if(cartLine.merchandise.product.productType === "NOT_FOR_SALE") {
      not_for_sale = true;
    }
  }
  console.log(`qty: ${qty}`);
  console.log(`not_for_sale: ${not_for_sale}`);

  // Use the `buyerJourney` intercept to conditionally block checkout progress
  // The ability to block checkout progress isn't guaranteed.
  // Refer to the "Check for the ability to block checkout progress" section for more information.
  useBuyerJourneyIntercept(({ canBlockProgress }) => {

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
    // NOT_FOR_SALE
    if (canBlockProgress && isNotForSale()) {
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
    const qty_max = 2;
    return qty <= qty_max;
  }
  function isNotForSale() {
    return not_for_sale;
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