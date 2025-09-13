import NotFound from "@/components/reactbits/NotFound";

export default function NotFoundPage() {
  return (
    <NotFound
      title="Page Not Found"
      description="The page you're looking for doesn't exist or has been moved. Let's get you back on track!"
      showBackButton={true}
      showHomeButton={true}
      showSearchButton={true}
    />
  );
}
