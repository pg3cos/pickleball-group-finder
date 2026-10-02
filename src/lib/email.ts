import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationUrl: string
) {
  const { data, error } = await resend.emails.send({
    from: "Pickleball Group Finder <onboarding@resend.dev>",
    to: [email],
    subject: "Verify your Pickleball Group Finder email",
    html: `
      <h2>Verify your email</h2>

      <p>Hi ${name},</p>

      <p>
        Click the button below to verify your email address
        for Pickleball Group Finder.
      </p>

      <p>
        <a
          href="${verificationUrl}"
          style="
            display: inline-block;
            padding: 12px 20px;
            background: #000;
            color: #fff;
            text-decoration: none;
            border-radius: 6px;
          "
        >
          Verify Email
        </a>
      </p>

      <p>
        This link expires in 24 hours.
      </p>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}