export default {
  // project: 'FlyEM Private',
  project: 'janeliacave-global',
  projectBaseUrlDefault: 'https://clio-store-vwzoicitea-uk.a.run.app',
  projectBaseUrlTest: 'https://clio-dev.janelia.org:8080',
  top_level_function: 'v2',
  imageSliceUrlTemplate: 'https://tensorslice-bmcp5imp6q-uk.a.run.app/slice/<xyz>/256_256_1/jpeg?location=<location>',
  google_auth: {
    client_id: '603632814084-su0abefiti02gm98ku5f2jlpfdja88bp.apps.googleusercontent.com',
    fetch_basic_profile: true,
    // need this scope to access google cloud storage buckets
    // scope: 'https://www.googleapis.com/auth/devstorage.read_only',
    ux_mode: 'pop-up',
  },
};
