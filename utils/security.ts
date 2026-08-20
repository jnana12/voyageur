
export async function checkPasswordCompromised(password: string): Promise<boolean> {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

        const prefix = hashHex.slice(0, 5);
        const suffix = hashHex.slice(5);

        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
        if (!response.ok) return false; // Fail safe

        const text = await response.text();
        const lines = text.split('\n');

        for (const line of lines) {
            const [hashSuffix] = line.split(':');
            if (hashSuffix === suffix) {
                return true; // Found!
            }
        }
        return false;
    } catch (e) {
        console.error("HIBP Check Failed", e);
        return false; // Fail safe
    }
}
