import { useEffect, useRef, useState } from "react";
import type {
  ChangeEvent,
  FormEvent,
} from "react";

type AccountType = "teacher" | "parent";

type ResultAccount = {
  id?: number;
  name: string;
  email: string;
  temporary_password?: string | null;
  existingAccount?: boolean;
  emailSent?: boolean;
  accountCreated?: boolean;
  student_lrn?: string;
};

type BulkInvalid = {
  row: number;
  name?: string;
  email?: string;
  student_lrn?: string;
  reason: string;
};

type BulkExistingParent = {
  row: number;
  name: string;
  email: string;
  student_lrn: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api";

function getAuthToken(): string | null {
  return (
    localStorage.getItem("viola_token") ||
    sessionStorage.getItem("viola_token")
  );
}

export default function GuidanceAccounts() {
  const [accountType, setAccountType] =
    useState<AccountType>("teacher");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [studentLrn, setStudentLrn] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [createdAccount, setCreatedAccount] =
    useState<ResultAccount | null>(null);

  const [editEmailOpen, setEditEmailOpen] =
    useState(false);

  const [editEmail, setEditEmail] =
    useState("");

  const [editEmailError, setEditEmailError] =
    useState("");

  const [editEmailLoading, setEditEmailLoading] =
    useState(false);

  const [emailCorrectionRequired, setEmailCorrectionRequired] =
    useState(false);

  const emailInputRef =
    useRef<HTMLInputElement | null>(null);

  const [bulkLoading, setBulkLoading] =
    useState(false);

  const [bulkSuccess, setBulkSuccess] =
    useState("");

  const [bulkError, setBulkError] =
    useState("");

  const [invalidRows, setInvalidRows] =
    useState<BulkInvalid[]>([]);

  const [existingParents, setExistingParents] =
    useState<BulkExistingParent[]>([]);

  const [createdCount, setCreatedCount] =
    useState(0);

  const [linkedCount, setLinkedCount] =
    useState(0);

  const [emailFailedCount, setEmailFailedCount] =
    useState(0);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!emailCorrectionRequired) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload,
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload,
      );
    };
  }, [emailCorrectionRequired]);

  const resetMessages = () => {
    setError("");
    setSuccess("");
    setCreatedAccount(null);
    setEditEmailOpen(false);
    setEditEmail("");
    setEditEmailError("");
    setEmailCorrectionRequired(false);
  };

  const switchAccountType = (
    type: AccountType,
  ) => {
    setAccountType(type);
    setName("");
    setEmail("");
    setPhone("");
    setStudentLrn("");
    setError("");
    setSuccess("");
    setCreatedAccount(null);
    setEmailCorrectionRequired(false);
  };

  const handleCreateAccount = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const token = getAuthToken();

    if (!token) {
      setError(
        "Your session has expired. Please log in again.",
      );
      return;
    }

    setLoading(true);
    resetMessages();

    try {
      const endpoint =
        accountType === "teacher"
          ? `${API_BASE_URL}/guidance/accounts/teacher`
          : `${API_BASE_URL}/guidance/accounts/parent`;

      const body =
        accountType === "teacher"
          ? {
              name: name.trim(),
              email: email.trim(),
              phone: phone.trim(),
            }
          : {
              name: name.trim(),
              email: email.trim(),
              phone: phone.trim(),
              student_lrn:
                studentLrn.trim(),
            };

      const response = await fetch(
        endpoint,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        },
      );

      const data =
        await response.json();

      const accountData =
        data.data || data;

      if (!response.ok) {
        if (
          accountData?.emailSent === false &&
          accountData?.accountCreated === false
        ) {
          setCreatedAccount({
            name:
              accountData.name ||
              name.trim(),
            email:
              accountData.email ||
              email.trim(),
            emailSent: false,
            accountCreated: false,
            student_lrn:
              accountData.student?.lrn ||
              studentLrn.trim() ||
              undefined,
          });

          setEmailCorrectionRequired(true);
          setError("");
          setSuccess("");

          return;
        }

        throw new Error(
          data.message ||
            "Unable to create account.",
        );
      }

      setSuccess(
        data.message ||
          "Account created successfully.",
      );

      setCreatedAccount({
        id: accountData.id,
        name:
          accountData.user?.name ||
          accountData.name ||
          name.trim(),
        email:
          accountData.user?.email ||
          accountData.email ||
          email.trim(),
        existingAccount:
          Boolean(
            accountData.existingAccount,
          ),
        emailSent:
          Boolean(accountData.emailSent),
        accountCreated:
          Boolean(
            accountData.accountCreated ??
              true,
          ),
        student_lrn:
          accountData.student?.lrn ||
          studentLrn.trim() ||
          undefined,
      });

      setEmailCorrectionRequired(false);
      setName("");
      setEmail("");
      setPhone("");
      setStudentLrn("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create account.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendParentCredentials = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      accountType !== "parent" ||
      !createdAccount
    ) {
      return;
    }

    const correctedEmail =
      editEmail.trim();

    if (!correctedEmail) {
      setEditEmailError(
        "Please enter the correct email address.",
      );
      return;
    }

    /*
     * If the first email attempt failed before
     * an account was saved, simply return the
     * corrected email to the creation form.
     */
    if (!createdAccount.id) {
      setEmail(correctedEmail);
      setEditEmailOpen(false);
      setEditEmailError("");
      setEmailCorrectionRequired(false);
      setCreatedAccount(null);
      setError("");
      setSuccess(
        "The email address has been updated. Please review the details and create the account again.",
      );

      window.setTimeout(() => {
        emailInputRef.current?.focus();
      }, 0);

      return;
    }

    const token = getAuthToken();

    if (!token) {
      setEditEmailError(
        "Your session has expired. Please log in again.",
      );
      return;
    }

    setEditEmailLoading(true);
    setEditEmailError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/guidance/accounts/parent/${createdAccount.id}/resend`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: correctedEmail,
            student_lrn:
              createdAccount.student_lrn || "",
          }),
        },
      );

      const data =
        await response.json();

      const accountData =
        data.data || data;

      if (!response.ok) {
        throw new Error(
          data.message ||
            "We could not send the account details to this email address.",
        );
      }

      setCreatedAccount({
        id: accountData.id,
        name:
          accountData.name ||
          createdAccount.name,
        email:
          accountData.email ||
          correctedEmail,
        existingAccount: true,
        emailSent: true,
        accountCreated: true,
        student_lrn:
          accountData.student?.lrn ||
          createdAccount.student_lrn,
      });

      setSuccess(
        data.message ||
          "The email address was updated and the account details were sent successfully.",
      );

      setEmailCorrectionRequired(false);
      setEditEmailOpen(false);
      setEditEmail("");
    } catch (err) {
      setEditEmailError(
        err instanceof Error
          ? err.message
          : "We could not send the account details to this email address.",
      );
    } finally {
      setEditEmailLoading(false);
    }
  };

  const handleBulkFile = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setBulkError(
        "Your session has expired. Please log in again.",
      );
      event.target.value = "";
      return;
    }

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase();

    if (
      extension !== "csv" &&
      extension !== "txt"
    ) {
      setBulkError(
        "Please upload a CSV or TXT file.",
      );
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setBulkError(
        "File must not exceed 5MB.",
      );
      event.target.value = "";
      return;
    }

    setBulkLoading(true);
    setBulkError("");
    setBulkSuccess("");
    setInvalidRows([]);
    setExistingParents([]);
    setCreatedCount(0);
    setLinkedCount(0);
    setEmailFailedCount(0);

    const formData =
      new FormData();

    formData.append(
      "file",
      file,
    );

    try {
      const endpoint =
        accountType === "teacher"
          ? `${API_BASE_URL}/guidance/accounts/teachers/bulk`
          : `${API_BASE_URL}/guidance/accounts/parents/bulk`;

      const response = await fetch(
        endpoint,
        {
          method: "POST",
          headers: {
            Accept:
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to process bulk accounts.",
        );
      }

      setCreatedCount(
        Number(data.summary?.newAccounts ??
          data.summary?.created ??
          0),
      );

      setLinkedCount(
        Number(
          data.summary?.existingParentsLinked ??
            data.existingParentsLinked ??
            0,
        ),
      );

      setEmailFailedCount(
        Number(
          data.summary?.emailFailed || 0,
        ),
      );

      setInvalidRows(
        Array.isArray(
          data.invalid,
        )
          ? data.invalid
          : [],
      );

      setExistingParents(
        Array.isArray(
          data.existingParents,
        )
          ? data.existingParents
          : [],
      );

      setBulkSuccess(
        data.message ||
          "Bulk account processing completed.",
      );
    } catch (err) {
      setBulkError(
        err instanceof Error
          ? err.message
          : "Unable to process bulk accounts.",
      );
    } finally {
      setBulkLoading(false);
      event.target.value = "";
    }
  };

  const downloadTemplate = () => {
    const content =
      accountType === "teacher"
        ? "name,email,phone\nJuan Dela Cruz,juan@example.com,09171234567\n"
        : "name,email,phone,student_lrn\nMaria Dela Cruz,maria@example.com,09171234567,123456789012\n";

    const blob =
      new Blob(
        [content],
        {
          type: "text/csv;charset=utf-8;",
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const link =
      document.createElement(
        "a",
      );

    link.href = url;

    link.download =
      accountType === "teacher"
        ? "teacher_accounts_template.csv"
        : "parent_accounts_template.csv";

    document.body.appendChild(
      link,
    );

    link.click();

    document.body.removeChild(
      link,
    );

    URL.revokeObjectURL(
      url,
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7">
      <div>
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          User Administration
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
          Account Management
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Create and manage Teacher and Parent accounts.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <button
          type="button"
          onClick={() =>
            switchAccountType(
              "teacher",
            )
          }
          className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
            accountType === "teacher"
              ? "bg-red-700 text-white"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          }`}
        >
          Teacher Accounts
        </button>

        <button
          type="button"
          onClick={() =>
            switchAccountType(
              "parent",
            )
          }
          className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
            accountType === "parent"
              ? "bg-red-700 text-white"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          }`}
        >
          Parent Accounts
        </button>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-white">
            Create{" "}
            {accountType ===
            "teacher"
              ? "Teacher"
              : "Parent"}{" "}
            Account
          </h2>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Account details will be sent to the email address provided.
          </p>
        </div>

        <form
          onSubmit={
            handleCreateAccount
          }
          className="space-y-5 p-6"
        >
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-400">
              {success}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Full Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target
                      .value,
                  )
                }
                required
                placeholder="Enter full name"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Email Address
              </label>

              <input
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target
                      .value,
                  )
                }
                required
                placeholder="Enter email address"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Contact Number
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target
                      .value,
                  )
                }
                placeholder="09XXXXXXXXX"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {accountType ===
              "parent" && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Student LRN
                </label>

                <input
                  type="text"
                  value={
                    studentLrn
                  }
                  onChange={(
                    event,
                  ) =>
                    setStudentLrn(
                      event
                        .target
                        .value,
                    )
                  }
                  required
                  placeholder="Enter student's LRN"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-gray-200 pt-5 dark:border-gray-700">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Creating..."
                : `Create ${
                    accountType ===
                    "teacher"
                      ? "Teacher"
                      : "Parent"
                  } Account`}
            </button>
          </div>
        </form>
      </section>

      {createdAccount && (
        <section
          className={`rounded-xl border shadow-sm ${
            createdAccount.emailSent === false
              ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20"
              : "border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20"
          }`}
        >
          <div
            className={`border-b px-6 py-5 ${
              createdAccount.emailSent === false
                ? "border-amber-200 dark:border-amber-900/50"
                : "border-green-200 dark:border-green-900/50"
            }`}
          >
            <h2
              className={`font-bold ${
                createdAccount.emailSent === false
                  ? "text-amber-900 dark:text-amber-300"
                  : "text-green-800 dark:text-green-400"
              }`}
            >
              {createdAccount.emailSent === false
                ? "Email Address Needs Attention"
                : `${accountType === "parent" ? "Parent" : "Teacher"} Account Created Successfully`}
            </h2>

            <p
              className={`mt-1 text-xs ${
                createdAccount.emailSent === false
                  ? "text-amber-800 dark:text-amber-400"
                  : "text-green-700 dark:text-green-500"
              }`}
            >
              {createdAccount.emailSent === false
                ? `We could not send the account details to ${createdAccount.email}. Please check the email address and correct it before continuing.`
                : `The account details have been sent to ${createdAccount.email}.`}
            </p>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {accountType === "parent"
                  ? "Parent"
                  : "Teacher"}
              </p>

              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {createdAccount.name}
              </p>
            </div>

            {accountType === "parent" && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Student LRN
                </p>

                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {createdAccount.student_lrn || "-"}
                </p>
              </div>
            )}

            <div className="md:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Email Address
              </p>

              <p className="mt-1 break-all font-semibold text-gray-900 dark:text-white">
                {createdAccount.email}
              </p>
            </div>
          </div>

          {accountType === "parent" &&
            createdAccount.emailSent === false && (
            <div className="flex justify-end border-t border-amber-200 px-6 py-5 dark:border-amber-900/50">
              <button
                type="button"
                onClick={() => {
                  setEditEmail(createdAccount.email);
                  setEditEmailError("");
                  setEditEmailOpen(true);
                }}
                className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800"
              >
                Edit Email Address
              </button>
            </div>
          )}
        </section>
      )}

      {editEmailOpen &&
        createdAccount &&
        accountType === "parent" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
              <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Edit Email Address
                </h2>

                <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  {createdAccount.id
                    ? "Update the email address and resend the account details. The student link will remain unchanged."
                    : "Correct the email address before creating the parent account. The Student LRN will remain unchanged."}
                </p>
              </div>

              <form
                onSubmit={
                  handleResendParentCredentials
                }
                className="space-y-5 p-6"
              >
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Student LRN
                  </label>

                  <input
                    type="text"
                    value={
                      createdAccount.student_lrn ||
                      ""
                    }
                    readOnly
                    className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Correct Email Address
                  </label>

                  <input
                    type="email"
                    value={editEmail}
                    onChange={(event) =>
                      setEditEmail(
                        event.target.value,
                      )
                    }
                    required
                    autoFocus
                    placeholder="Enter correct email address"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {editEmailError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                    {editEmailError}
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">
                  <button
                    type="submit"
                    disabled={
                      editEmailLoading ||
                      !editEmail.trim()
                    }
                    className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {editEmailLoading
                      ? "Saving..."
                      : createdAccount.id
                        ? "Save & Resend"
                        : "Use This Email"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                Bulk Account Registration
              </h2>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Upload a CSV or TXT file to process multiple{" "}
                {accountType ===
                "teacher"
                  ? "teachers"
                  : "parents"}{" "}
                at once.
              </p>
            </div>

            <button
              type="button"
              onClick={
                downloadTemplate
              }
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Download Template
            </button>
          </div>
        </div>

        <div className="p-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={
              handleBulkFile
            }
            className="hidden"
          />

          <button
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={bulkLoading}
            className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 px-6 py-10 text-center transition hover:border-red-400 hover:bg-red-50/50 dark:border-gray-600 dark:hover:border-red-700 dark:hover:bg-red-950/20"
          >
            <span className="text-3xl">
              ↑
            </span>

            <span className="mt-3 text-sm font-bold text-gray-900 dark:text-white">
              {bulkLoading
                ? "Processing file..."
                : "Click to upload CSV or TXT"}
            </span>

            <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Maximum file size: 5MB
            </span>
          </button>

          {bulkError && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {bulkError}
            </div>
          )}

          {bulkSuccess && (
            <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-400">
              {bulkSuccess}
            </div>
          )}

          {(createdCount > 0 ||
            linkedCount > 0 ||
            emailFailedCount > 0) && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Newly Created
                </p>

                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {createdCount}
                </p>
              </div>

              {accountType ===
                "parent" && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Existing Accounts Linked
                  </p>

                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                    {linkedCount}
                  </p>
                </div>
              )}
              
              {emailFailedCount > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Email Addresses Needing Attention
                  </p>

                  <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-300">
                    {emailFailedCount}
                  </p>
                </div>
              )}
            </div>
          )}

          {existingParents.length >
            0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
                Existing Parent Accounts Linked
              </h3>

              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                        Row
                      </th>

                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                        Name
                      </th>

                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                        Email
                      </th>

                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                        Student LRN
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {existingParents.map(
                      (item) => (
                        <tr
                          key={`${item.row}-${item.email}-${item.student_lrn}`}
                        >
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                            {item.row}
                          </td>

                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                            {item.name}
                          </td>

                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                            {item.email}
                          </td>

                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                            {
                              item.student_lrn
                            }
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {invalidRows.length >
            0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-bold text-red-700 dark:text-red-400">
                Records Needing Attention
              </h3>

              <div className="overflow-x-auto rounded-lg border border-red-200 dark:border-red-900/50">
                <table className="min-w-full text-sm">
                  <thead className="bg-red-50 dark:bg-red-950/30">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-red-700 dark:text-red-400">
                        Row
                      </th>

                      <th className="px-4 py-3 text-left font-semibold text-red-700 dark:text-red-400">
                        Name
                      </th>

                      <th className="px-4 py-3 text-left font-semibold text-red-700 dark:text-red-400">
                        Email
                      </th>

                      {accountType ===
                        "parent" && (
                        <th className="px-4 py-3 text-left font-semibold text-red-700 dark:text-red-400">
                          LRN
                        </th>
                      )}

                      <th className="px-4 py-3 text-left font-semibold text-red-700 dark:text-red-400">
                        Reason
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-red-100 dark:divide-red-900/30">
                    {invalidRows.map(
                      (
                        item,
                        index,
                      ) => (
                        <tr
                          key={`${item.row}-${index}`}
                        >
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                            {item.row}
                          </td>

                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                            {item.name ||
                              "-"}
                          </td>

                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                            {item.email ||
                              "-"}
                          </td>

                          {accountType ===
                            "parent" && (
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                              {item.student_lrn ||
                                "-"}
                            </td>
                          )}

                          <td className="px-4 py-3 text-red-700 dark:text-red-400">
                            {
                              item.reason
                            }
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}