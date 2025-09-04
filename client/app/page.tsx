import FileUploadComponent from "./components/FileUploadComponent";

export default function Home() {
  return (
    <section className="min-h-screen w-screen flex">
      <div className="w-[30%] min-h-screen">
        <FileUploadComponent />
      </div>
      <div className="w-[70%] min-h-screen"></div>
    </section>
  );
}
