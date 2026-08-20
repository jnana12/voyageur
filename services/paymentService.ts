
import { UserProfile } from '../types';
import { dbService } from './dbService';

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

declare global {
    interface Window {
        Razorpay: any;
    }
}

export const paymentService = {
    loadScript: (): Promise<boolean> => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = RAZORPAY_SCRIPT;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    },

    initiatePayment: async (
        user: UserProfile,
        amountInRupees: number,
        credits: number,
        onSuccess: (paymentId: string) => void,
        onFailure: (error: any) => void
    ) => {
        const res = await paymentService.loadScript();

        if (!res) {
            alert('Razorpay SDK failed to load. Are you online?');
            onFailure('SDK Load Failed');
            return;
        }

        const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_1234567890";
        if (import.meta.env.DEV) {
            console.log("🔑 Razorpay Key ID Used:", keyId);
        }

        const options: any = {
            key: keyId,
            amount: amountInRupees * 100, // Amount in paise
            currency: "INR",
            name: "Voyageur AI",
            description: `${credits} Trip Credit${credits > 1 ? 's' : ''}`,
            image: "https://ui-avatars.com/api/?name=Voyageur+AI&background=0D8ABC&color=fff",
            handler: async function (response: any) {
                console.log("✅ Payment Success:", response);

                try {
                    // 1. Securely Record Payment (Idempotent)
                    const recorded = await dbService.recordPaymentRPC(
                        user.id,
                        'razorpay',
                        response.razorpay_payment_id,
                        amountInRupees * 100,
                        credits,
                        'success'
                    );

                    // 2. Add Credits (Atomic)
                    // Even if recorded is false (duplicate), we assume credits were added previously.
                    // But to be safe, only add if recorded is true?
                    // "ON CONFLICT DO NOTHING" returns false.
                    // If it returns false, it means we ALREADY processed it. So DO NOT add credits again.
                    if (recorded) {
                        await dbService.addCreditsRPC(user.id, credits);
                        console.log("💳 Credits Added via RPC");
                        // Trigger UI update
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('voyageur:user-update', {
                                detail: { id: user.id, fullName: user.fullName ?? null }
                            }));
                        }
                    } else {
                        console.warn("⚠️ Payment already recorded. Skipping credit addition.");
                    }

                    onSuccess(response.razorpay_payment_id);
                } catch (err) {
                    console.error("❌ Credit Update Failed:", err);
                    onFailure(err);
                }
            },
            prefill: {
                name: user.fullName,
                email: user.email
            },
            theme: {
                color: "#22d3ee"
            },
            modal: {
                ondismiss: function () {
                    console.log('Payment modal dismissed');
                    onFailure('Payment cancelled by user');
                }
            }
        };

        if ((user as any).phone) {
            options.prefill.contact = (user as any).phone;
        }

        const paymentObject = new window.Razorpay(options);

        paymentObject.on('payment.failed', function (response: any) {
            console.error("❌ Payment Failed:", response.error);
            onFailure(response.error);
        });

        paymentObject.open();
    }
};
