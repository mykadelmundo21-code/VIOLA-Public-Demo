<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>VIOLA Violation Update</title>
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

        <!-- HEADER -->
        <div
            style="
                background-color: #1f2937;
                padding: 30px 24px;
                border-radius: 14px 14px 0 0;
                text-align: center;
            "
        >

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


        <!-- CONTENT -->
        <div
            style="
                background-color: #ffffff;
                padding: 36px;
                border-radius: 0 0 14px 14px;
                border: 1px solid #e5e7eb;
                border-top: none;
            "
        >

            <p
                style="
                    margin: 0 0 8px 0;
                    padding: 0;
                    color: #b91c1c;
                    font-size: 13px;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                "
            >
                Violation Report Update
            </p>

            <h2
                style="
                    margin: 0 0 24px 0;
                    padding: 0;
                    font-size: 22px;
                    line-height: 1.3;
                    color: #111827;
                "
            >
                {{ $statusLabel }}
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
                The violation report for
                <strong style="color: #111827;">
                    {{ $studentName }}
                </strong>
                has been updated by the Guidance Office.
            </p>


            <!-- VIOLATION DETAILS -->
            <table
                role="presentation"
                cellpadding="0"
                cellspacing="0"
                border="0"
                width="100%"
                style="
                    width: 100%;
                    margin: 24px 0;
                    border-collapse: collapse;
                "
            >
                <tr>
                    <td
                        style="
                            padding: 16px;
                            background-color: #f9fafb;
                            border: 1px solid #e5e7eb;
                            border-radius: 10px;
                        "
                    >

                        <p
                            style="
                                margin: 0 0 8px 0;
                                color: #6b7280;
                                font-size: 13px;
                            "
                        >
                            Student
                        </p>

                        <p
                            style="
                                margin: 0 0 16px 0;
                                color: #111827;
                                font-size: 15px;
                                font-weight: bold;
                            "
                        >
                            {{ $studentName }}
                        </p>


                        <p
                            style="
                                margin: 0 0 8px 0;
                                color: #6b7280;
                                font-size: 13px;
                            "
                        >
                            Violation
                        </p>

                        <p
                            style="
                                margin: 0 0 16px 0;
                                color: #111827;
                                font-size: 15px;
                                font-weight: bold;
                            "
                        >
                            {{ $violationName }}
                        </p>


                        <p
                            style="
                                margin: 0 0 8px 0;
                                color: #6b7280;
                                font-size: 13px;
                            "
                        >
                            Current Status
                        </p>

                        <p
                            style="
                                margin: 0;
                                color: #b91c1c;
                                font-size: 15px;
                                font-weight: bold;
                            "
                        >
                            {{ $statusLabel }}
                        </p>

                    </td>
                </tr>
            </table>


            <!-- MESSAGE -->
            <p
                style="
                    margin: 0;
                    padding: 0;
                    color: #6b7280;
                    line-height: 1.6;
                    font-size: 15px;
                "
            >
                {{ $bodyMessage }}
            </p>


            <hr
                style="
                    margin: 28px 0;
                    padding: 0;
                    border: none;
                    border-top: 1px solid #e5e7eb;
                "
            >


            <p
                style="
                    margin: 0;
                    padding: 0;
                    color: #9ca3af;
                    font-size: 12px;
                    line-height: 1.5;
                    text-align: center;
                "
            >
                Please log in to the VIOLA portal for more information.
            </p>

            <p
                style="
                    margin: 16px 0 0;
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