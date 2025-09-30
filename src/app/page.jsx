import Footer from "@/MainComponent/Footer";
import HomeAbout from "@/MainComponent/HomeAbout";
import HomeNavbar from "@/MainComponent/HomeNavbar";

export default function Home() {
  return (
    <>
      <HomeNavbar />
      <section class="mainPage d-flex align-items-center">
        <div class="container">
          <div class="row uper">
            <div class="col-lg-6 d-flex flex-column justify-content-center text-lg-start  order-2 order-lg-1 ">
              <h1 data-aos="fade-up">Power your home with confidence</h1>
              <h2 data-aos="fade-up" data-aos-delay="400">
                Trust Noretek for reliable gas distribution that keeps your home
                running smoothly,
              </h2>
              <div data-aos="fade-up" data-aos-delay="600">
                <div class="text-center text-lg-start ">
                  <a
                    href="/customer-signin"
                    class="btn-get-started text-decoration-none py-4 scrollto  d-inline-flex align-items-center justify-content-center align-self-center"
                  >
                    <span className=" fw-bold">Customer Login</span>
                  </a>
                  <a
                    href="/stafflogin"
                    class="btn-register text-decoration-none py-4 scrollto mx-lg-1  d-inline-flex align-items-center justify-content-center align-self-center"
                  >
                    <span className=" fw-bold">Staff Login</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div id="how-to">
        <HomeAbout />
      </div>
      <Footer />
    </>
  );
}
