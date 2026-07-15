import Link from "next/link";

export const metadata = { title: "Delivery & COD policy — MediStore" };

/**
 * COD policy (eng review T3): written rules for the three ways cash-on-
 * delivery goes wrong. Three sentences of policy = the difference between
 * looking like a store and looking like a scam.
 */
export default function PolicyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-emerald-700 hover:underline">
        ← Back to store
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Delivery &amp; cash-on-delivery policy</h1>

      <section className="mt-6 space-y-4 text-sm leading-6 text-slate-700">
        <div>
          <h2 className="font-semibold text-slate-900">How ordering works</h2>
          <p>
            Place your order online — no account needed. We call your mobile number to confirm every
            order before it goes out. You pay in cash when the order arrives at your door, and every
            delivery includes a printed invoice.
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">Where and when we deliver</h2>
          <p>
            We currently deliver within our served areas only (shown at checkout). Orders confirmed
            before the same-day cutoff are delivered the same day; later orders arrive the next day.
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">If something goes wrong</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <span className="font-medium">Changed your mind at the door?</span> You may refuse the
              delivery — no payment, no questions.
            </li>
            <li>
              <span className="font-medium">Wrong or damaged item?</span> We replace it free, or remove
              it from your bill on the spot.
            </li>
            <li>
              <span className="font-medium">We can&apos;t reach you?</span> If your phone is unreachable
              after 3 attempts, the order is cancelled automatically — nothing owed.
            </li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">What we sell</h2>
          <p>
            We sell over-the-counter medicines and health essentials, sourced from licensed local
            pharmacies. We do not sell prescription-only medicine online.
          </p>
        </div>
      </section>
    </main>
  );
}
