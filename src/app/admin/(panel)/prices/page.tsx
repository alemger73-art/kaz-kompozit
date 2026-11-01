import { redirect } from 'next/navigation';

export default function PricesIndex() {
  redirect('/admin/prices/retail');
}
