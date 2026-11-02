import { Checkout } from "@polar-sh/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const POLAR_UNIT_PRODUCT_ID = process.env.POLAR_UNIT_PRODUCT_ID || "61f8dcb9-7b29-4877-9e85-38f4721ac085";

const polarCheckout = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN as string,
  successUrl: process.env.POLAR_SUCCESS_URL || "http://localhost:3000/billing?status=success",
  returnUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000/billing",
  server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
  theme: "dark",
});

export const GET = async (req: Request) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const url = new URL(req.url);

  // Default to unit pricing product if products param not present
  if (!url.searchParams.has("products")) {
    const productId = url.searchParams.get("productId") || POLAR_UNIT_PRODUCT_ID;
    url.searchParams.set("products", productId);
  }

  // Attach user identity for Polar customer & webhook attribution
  if (user) {
    url.searchParams.set("customerExternalId", user.id);
    if (user.email) url.searchParams.set("customerEmail", user.email);
    
    // Pass metadata so webhook can easily parse user_id
    const existingMeta = url.searchParams.has("metadata")
      ? JSON.parse(url.searchParams.get("metadata") || "{}")
      : {};
    url.searchParams.set("metadata", JSON.stringify({ ...existingMeta, user_id: user.id }));
  }

  const modifiedReq = new Request(url.toString(), req);
  return polarCheckout(modifiedReq);
};
