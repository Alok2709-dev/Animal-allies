/* Public settings only — Key IDs are safe to expose; NEVER put any secret here. */
window.ANIMAL_ALLIES_PAYMENT_CONFIG = {
  /* Razorpay: cards, UPI & wallets via Razorpay checkout */
  razorpayKeyId: 'rzp_test_replace_with_your_key_id',

  /* ZeroPaye: zero-fee, self-hosted direct UPI (github.com/DKUMARGUPTA/ZeroPaye).
     Set enabled:true only after your ZeroPaye server is running and
     ZEROPAYE_API_URL / ZEROPAYE_API_KEY are configured in your .env */
  zeroPaye: {
    enabled: false,          // flip to true once ZeroPaye server is live
    upiId:   '7398259999@ybl',
  },
};
