import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const serverKey = import.meta.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      return new Response(
        JSON.stringify({ error: 'MIDTRANS_SERVER_KEY belum diisi di .env' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isProduction = serverKey.startsWith('Mid-server-');
    const midtransUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const grossAmount = Math.round(Number(body.gross_amount));

    const formattedItems = body.items.map((item: any) => ({
      id: String(item.id),
      price: Math.round(Number(item.price)),
      quantity: Math.round(Number(item.quantity)),
      name: String(item.name).substring(0, 50)
    }));

    const authHeader = 'Basic ' + btoa(serverKey + ':');

    const response = await fetch(midtransUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: String(body.order_id),
          gross_amount: grossAmount
        },
        item_details: formattedItems
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Midtrans API Error Details:', JSON.stringify(data, null, 2));
      return new Response(JSON.stringify({ error: data }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Charge API Exception:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};