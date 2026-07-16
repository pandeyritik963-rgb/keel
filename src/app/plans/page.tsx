import type { Metadata } from "next";
import { PlansBoard } from "@/components/plans/PlansBoard";

export const metadata: Metadata = {
  title: "Plans — Keel",
  description: "Your DCA plans and the cost-basis proof against naive DCA. Non-custodial; stored in this browser.",
};

export default function PlansPage() {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-display font-extrabold tracking-tight text-foreground">Plans</h1>
        <p className="mt-2 max-w-2xl text-body text-muted">
          Each interval the signal sizes the buy from live SoSoValue ETF flows; you confirm and sign it, SoDEX executes
          it in the testnet sandbox. Plans and buy history are stored in this browser only — Keel has no server account
          and never holds keys.
        </p>
      </section>
      <PlansBoard />
    </div>
  );
}
