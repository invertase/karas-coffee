/*
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { format, set } from 'date-fns';
import cx from 'classnames';
import React, { useEffect, useRef, useState } from 'react';
import { AddressBook } from '../../components/AddressBook';
import { Button } from '../../components/Button';
import { OrderSummary } from '../../components/OrderSummary';
import { useCart } from '../../hooks/useCart';
import { useCheckout } from '../../hooks/useCheckout';
import { useRatesCalculation } from '../../hooks/useRatesCalculation';
import { ShippingRate, Address, Shipment } from '../../types';
import { emptyArray } from '../../utils';
import { Skeleton } from '../../components/Skeleton';
import { useUser } from '../../hooks/useUser';
import { Link } from 'react-router-dom';
import { LoadingCover } from '../../components/LoadingCover';

export function Shipping() {
  const { cart } = useCart();
  const checkout = useCheckout();

  const [address, setAddress] = useState<Address | null>(null);
  const [rate, setRate] = useState<ShippingRate | null>(null);
  const shipment = useRef<Shipment>();
  const user = useUser();

  const [isAwaitingStripeCheckout, setIsAwaitingStripeCheckout] = useState(false);

  async function onPlaceOrder() {
    if (!address) return;
    if (!rate) return;

    setIsAwaitingStripeCheckout(true);

    checkout.trigger({
      mode: 'payment',
      success_url: `${window.location.origin}/account/orders?completed=true`,
      cancel_url: window.location.href,
      line_items: [
        ...cart.map((item) => ({
          price: item.metadata.price,
          quantity: item.quantity,
        })),
        {
          price_data: {
            currency: 'USD',
            unit_amount_decimal: (rate.shippingAmount.amount * 100) | 0,
            product_data: {
              name: 'Shipping',
              description: `Shipping via ${rate.carrierFriendlyName}`,
            },
          },
          quantity: 1,
        },
      ],
      collect_shipping_address: true,
      shipment: {
        ...shipment.current!,
        carrierId: rate.carrierId,
        serviceCode: rate.serviceCode,
      },
      cart,
    });
  }

  if (isAwaitingStripeCheckout) return <LoadingCover />;

  return (
    <section className="px-4 mt-8 lg:px-0">
      <div className="max-w-3xl mx-auto"></div>
      <h1 className="mt-8 mb-8 text-4xl font-extrabold tracking-wide text-gray-800">Shipping</h1>
      <p className="text-sm text-gray-500">
        Enter a new address or select an existing address below to calculate shipping rates.
      </p>
      {cart.length === 0 && (
        <>
          <div className="flex items-center justify-center h-64 text-gray-600">Your cart is currently empty.</div>
        </>
      )}
      {cart.length > 0 && (
        <div className="grid-cols-12 gap-16 lg:grid">
          <div className="col-start-1 col-end-8 mt-4">
            <AddressBook
              selectedAddressId={address?.id}
              onSelect={(address) => {
                setAddress(address);
              }}
            />
          </div>
          <div className="col-start-8 col-end-13 space-y-4">
            <ShippingRates
              address={address}
              onSelect={(rate, shipping) => {
                setRate(rate);
                shipment.current = shipping;
              }}
            />
            <OrderSummary
              shippingCost={rate?.shippingAmount.amount}
              shippingLabel={
                rate?.carrierFriendlyName
                  ? `Shipping via ${rate.serviceType} (${
                      rate.carrierDeliveryDays.length > 1
                        ? rate.carrierDeliveryDays
                        : `within ${rate.carrierDeliveryDays} day(s)`
                    })`
                  : undefined
              }
              shipping={
                <>
                  {!rate && <span>TBC</span>}
                  {!!rate && <span>${parseFloat(`${rate.shippingAmount.amount}`).toFixed(2)}</span>}
                </>
              }
            />
            {user.data && !user.data.isAnonymous ? (
              <Button disabled={!rate || !user.data} loading={checkout.loading} onClick={onPlaceOrder}>
                Place Order &rarr;
              </Button>
            ) : (
              <Link
                className="relative w-full flex justify-center py-1 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                to={'/signin?redirect=/checkout'}
              >
                Sign in to place order
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ShippingRates({
  address,
  onSelect,
}: {
  address: Address | null;
  onSelect: (rate: ShippingRate, shipment: Shipment) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const shipment = useRef<Shipment>();

  // const rates = useRatesCalculation();
  const rates = {
    mutate: (x: any) => {},
    isSuccess: true,
    isError: false,
    isLoading: false,
    error: {
      message: 'Error',
    },
    data: {
      rates: [
        {
          carrierDeliveryDays: '5',
          rateId: 'rate_123456789',
          carrierId: 'carrier_987654321',
          serviceCode: 'service_code_example',
          serviceType: 'Standard',
          carrierFriendlyName: 'Example Carrier',
          deliveryDays: '5',
          shippingAmount: {
            amount: 9.99,
          },
        },
      ],
    },
  };
  const id = address?.id;

  useEffect(() => {
    if (!id) return;
    shipment.current = {
      shipDate: format(new Date(), 'yyyy-MM-dd'),
      shipFrom: {
        name: "Kara's Coffee",
        phone: '512-343-5283',
        addressLine1: '500 W 2nd St',
        cityLocality: 'Austin',
        stateProvince: 'TX',
        postalCode: '78701',
        countryCode: 'US',
      },
      shipTo: {
        name: address.name,
        addressLine1: address.appAddress.line1,
        addressLine2: address.appAddress.line2,
        cityLocality: address.appAddress.city,
        stateProvince: address.appAddress.state,
        postalCode: address.appAddress.postalCode,
        countryCode: 'US',
      },
      packages: [
        {
          weight: {
            value: 30,
            unit: 'gram',
          },
        },
      ],
    };

    rates.mutate({
      rateOptions: {
        carrierIds: ['se-765964', 'se-765965', 'se-765963'],
        serviceCodes: ['usps_media_mail'],
      },
      shipment: shipment.current,
    });
  }, [id]);

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800">Shipping Rates</h2>
      {!address && <p className="mt-4 text-sm text-gray-500">Select an address to calculate shipping rates.</p>}
      {rates.isLoading && (
        <div className="mt-2 space-y-3">
          {emptyArray(5).map((_, i) => (
            <div key={i} className="flex h-8">
              <div className="flex-grow">
                <Skeleton className="h-8 w-36" />
              </div>
              <Skeleton className="w-12 h-8" />
            </div>
          ))}
        </div>
      )}
      {!!address && rates.isSuccess && (
        <div>
          <div className="mt-2">
            <p className="text-gray-800">Select a shipping carrier and rate:</p>
            <div className="mt-2 text-sm text-gray-500">
              {[
                address.name,
                address.appAddress.line1,
                address.appAddress.line2,
                address.appAddress.city,
                address.appAddress.state,
                address.appAddress.postalCode,
              ]
                .filter(Boolean)
                .join(', ')}
            </div>
          </div>
          <div className="mt-2 max-h-[200px] overflow-y-auto pr-6">
            {rates.data.rates
              .sort((a, b) => (a.shippingAmount.amount < b.shippingAmount.amount ? -1 : 0))
              .map((rate) => (
                <div
                  className={cx('flex items-center border bg-white rounded p-2 mb-2', {
                    'hover:bg-indigo-50': rate.rateId !== selected,
                    'border-indigo-500 shadow-inner	': rate.rateId === selected,
                  })}
                  role="button"
                  key={rate.rateId}
                  onClick={() => {
                    onSelect(rate, shipment.current!);
                    setSelected(rate.rateId);
                  }}
                >
                  <div className="flex-grow">
                    <div className="font-bold text-gray-800 font-sm">{rate.serviceType}</div>
                    <p className="text-sm text-gray-700">
                      {rate.carrierDeliveryDays.length > 1
                        ? rate.carrierDeliveryDays
                        : `Within ${rate.carrierDeliveryDays} day(s).`}
                    </p>
                  </div>
                  <div className="text-sm font-bold text-gray-700">
                    ${parseFloat(`${rate.shippingAmount.amount}`).toFixed(2)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      {rates.isError && <p className="mt-4 text-sm text-red-500">{rates.error.message}</p>}
    </div>
  );
}
