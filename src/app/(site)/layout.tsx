import GoogleAdsTag from "@/components/GoogleAdsTag";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LocalBusinessJsonLd from "@/components/LocalBusinessJsonLd";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <LocalBusinessJsonLd />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <GoogleAdsTag />
    </>
  );
}
