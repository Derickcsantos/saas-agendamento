import {
  CreditCard,
  CreditCardBack,
  CreditCardCvv,
  CreditCardExpiry,
  CreditCardMagStripe,
  CreditCardName,
  CreditCardNumber,
} from '@/components/ui/shadcn-io/credit-card';

export const CreditCardComponent = ({name, number, month, year, cvv}) => (
  <CreditCard>
    <CreditCardBack className="bg-[#cfcfcf] text-black">
      <CreditCardMagStripe />
      <CreditCardNumber className="absolute bottom-0 left-0">
        {number || "**** **** **** ****" }
      </CreditCardNumber>
      <div className="absolute @xs:bottom-12 bottom-8 flex w-full @xs:flex-row flex-col @xs:justify-between gap-4">
        <CreditCardName className="flex-1">{name || "Nome do TITULAR"}</CreditCardName>
        <div className="flex flex-1 @xs:justify-between gap-4">
          <CreditCardExpiry>{month || "MM"}/{year || "****"}</CreditCardExpiry>
          <CreditCardCvv>{cvv || "***"}</CreditCardCvv>
        </div>
      </div>
    </CreditCardBack>
  </CreditCard>
);
