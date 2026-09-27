<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>VIOLA Password Reset</title>
</head>

<body
    style="
        margin: 0;
        padding: 0;
        background-color: #f3f4f6;
        font-family: Arial, Helvetica, sans-serif;
        color: #111827;
    "
>
    <div
        style="
            max-width: 600px;
            margin: 40px auto;
            padding: 0 20px;
        "
    >

        <!-- =========================
             HEADER
        ========================== -->
        <div
            style="
                background-color: #1f2937;
                padding: 30px 24px;
                border-radius: 14px 14px 0 0;
                text-align: center;
            "
        >

            <!-- Centered Logo -->
            <table
                role="presentation"
                cellpadding="0"
                cellspacing="0"
                border="0"
                width="100%"
                style="
                    width: 100%;
                    border-collapse: collapse;
                "
            >
                <tr>
                    <td
                        align="center"
                        style="
                            text-align: center;
                        "
                    >

                        <table
                            role="presentation"
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            style="
                                margin: 0 auto;
                                border-collapse: collapse;
                            "
                        >
                            <tr>
                                <td
                                    align="center"
                                    valign="middle"
                                    style="
                                        width: 64px;
                                        height: 64px;
                                        background-color: #ffffff;
                                        border-radius: 12px;
                                        text-align: center;
                                        vertical-align: middle;
                                    "
                                >
                                    <span
                                        style="
                                            display: block;
                                            color: #b91c1c;
                                            font-size: 32px;
                                            line-height: 64px;
                                            font-weight: bold;
                                            text-align: center;
                                            font-family: Arial, Helvetica, sans-serif;
                                        "
                                    >
                                        V
                                    </span>
                                </td>
                            </tr>
                        </table>

                    </td>
                </tr>
            </table>

            <!-- VIOLA -->
            <h1
                style="
                    margin: 16px 0 0;
                    padding: 0;
                    color: #ffffff;
                    font-size: 24px;
                    line-height: 1.2;
                    font-weight: bold;
                    text-align: center;
                "
            >
                VIOLA
            </h1>

        </div>


        <!-- =========================
             CONTENT
        ========================== -->
        <div
            style="
                background-color: #ffffff;
                padding: 36px;
                border-radius: 0 0 14px 14px;
                border: 1px solid #e5e7eb;
                border-top: none;
            "
        >

            <h2
                style="
                    margin: 0 0 24px 0;
                    padding: 0;
                    font-size: 22px;
                    line-height: 1.3;
                    color: #111827;
                "
            >
                Password Reset Code
            </h2>


            <p
                style="
                    margin: 0 0 16px 0;
                    padding: 0;
                    color: #6b7280;
                    line-height: 1.6;
                    font-size: 15px;
                "
            >
                We received a request to reset your VIOLA account
                password.
            </p>


            <p
                style="
                    margin: 0;
                    padding: 0;
                    color: #6b7280;
                    line-height: 1.6;
                    font-size: 15px;
                "
            >
                Use the verification code below:
            </p>


            <!-- =========================
                 VERIFICATION CODE
            ========================== -->
            <table
                role="presentation"
                cellpadding="0"
                cellspacing="0"
                border="0"
                width="100%"
                style="
                    width: 100%;
                    margin: 28px 0;
                    border-collapse: collapse;
                "
            >
                <tr>
                    <td
                        align="center"
                        style="
                            padding: 20px;
                            background-color: #fef2f2;
                            border: 1px solid #fecaca;
                            border-radius: 10px;
                            text-align: center;
                        "
                    >

                        <span
                            style="
                                color: #b91c1c;
                                font-size: 32px;
                                line-height: 1.2;
                                font-weight: bold;
                                letter-spacing: 8px;
                                font-family: Arial, Helvetica, sans-serif;
                            "
                        >
                            {{ $code }}
                        </span>

                    </td>
                </tr>
            </table>


            <!-- =========================
                 EXPIRATION
            ========================== -->
            <p
                style="
                    margin: 0 0 16px 0;
                    padding: 0;
                    color: #6b7280;
                    line-height: 1.6;
                    font-size: 15px;
                "
            >
                This code will expire in
                <strong style="color: #374151;">
                    10 minutes
                </strong>.
            </p>


            <!-- =========================
                 SECURITY NOTICE
            ========================== -->
            <p
                style="
                    margin: 0;
                    padding: 0;
                    color: #6b7280;
                    line-height: 1.6;
                    font-size: 15px;
                "
            >
                If you did not request a password reset, you can
                safely ignore this email.
            </p>


            <!-- Divider -->
            <hr
                style="
                    margin: 28px 0;
                    padding: 0;
                    border: none;
                    border-top: 1px solid #e5e7eb;
                "
            >


            <!-- =========================
                 FOOTER
            ========================== -->
            <p
                style="
                    margin: 0;
                    padding: 0;
                    text-align: center;
                    color: #9ca3af;
                    font-size: 12px;
                    line-height: 1.5;
                "
            >
                VIOLA • An Intelligent Student Violation Monitoring
            </p>

        </div>

    </div>
</body>
</html>