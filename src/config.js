export default {
  // project: 'FlyEM Private',
  project: 'clio-294722',
  projectBaseUrlDefault: 'https://clio-store-vwzoicitea-uk.a.run.app',
  projectBaseUrlTest: 'https://clio-store-test-694445642738.us-east4.run.app',
  top_level_function: 'v2',
  imageSliceUrlTemplate: 'https://tensorslice-bmcp5imp6q-uk.a.run.app/slice/<xyz>/256_256_1/jpeg?location=<location>',
  google_auth: {
    // client_id: '833853795110-2eu65hnvthhcibk64ibftemb0i1tlu97.apps.googleusercontent.com',
    client_id: '464281314980-qlc4o2ce8htnhhgdb0g0j681de2l3980.apps.googleusercontent.com',
    fetch_basic_profile: true,
    // need this scope to access google cloud storage buckets
    // scope: 'https://www.googleapis.com/auth/devstorage.read_only',
    ux_mode: 'pop-up',
  },
};
