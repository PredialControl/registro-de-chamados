export default function MobileContainer({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <main className="min-h-screen w-full mx-auto bg-background shadow-xl flex flex-col relative pb-20 transition-all duration-300">
            {children}
        </main>
    );
}
