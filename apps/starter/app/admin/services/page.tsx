"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import styles from "./page.module.css";

type Service = {
  name: string;
  description: string;
  duration: string;
  price: string;
};

type Group = {
  title: string;
  items: Service[];
};

type Document = {
  pageFile: string;
  pagePath: string;
  heading: string;
  intro: string;
  groups: Group[];
};

const EMPTY_SERVICE: Service = {
  name: "",
  description: "",
  duration: "",
  price: "",
};

export default function ServicesPage() {
  const [data, setData] =
    useState<Document | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [toast, setToast] =
    useState<{
      msg: string;
      ok: boolean;
    } | null>(null);

  function showToast(
    msg: string,
    ok: boolean,
  ) {
    setToast({ msg, ok });

    setTimeout(
      () => setToast(null),
      3000,
    );
  }

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(
          "/api/admin/services",
        );

        if (!res.ok) {
          const result =
            await res.json().catch(
              () => ({}),
            );

          throw new Error(
            result.error ||
              "Could not load services.",
          );
        }

        setData(await res.json());
      } catch (error) {
        showToast(
          (error as Error).message,
          false,
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function updateGroup(
    groupIndex: number,
    patch: Partial<Group>,
  ) {
    setData((current) => {
      if (!current) return current;

      const groups =
        current.groups.map(
          (group, index) =>
            index === groupIndex
              ? {
                  ...group,
                  ...patch,
                }
              : group,
        );

      return {
        ...current,
        groups,
      };
    });
  }

  function updateService(
    groupIndex: number,
    serviceIndex: number,
    patch: Partial<Service>,
  ) {
    setData((current) => {
      if (!current) return current;

      const groups =
        current.groups.map(
          (group, index) => {
            if (
              index !== groupIndex
            ) {
              return group;
            }

            return {
              ...group,
              items:
                group.items.map(
                  (
                    service,
                    itemIndex,
                  ) =>
                    itemIndex ===
                    serviceIndex
                      ? {
                          ...service,
                          ...patch,
                        }
                      : service,
                ),
            };
          },
        );

      return {
        ...current,
        groups,
      };
    });
  }

  function addService(
    groupIndex: number,
  ) {
    setData((current) => {
      if (!current) return current;

      return {
        ...current,
        groups:
          current.groups.map(
            (group, index) =>
              index === groupIndex
                ? {
                    ...group,
                    items: [
                      ...group.items,
                      {
                        ...EMPTY_SERVICE,
                      },
                    ],
                  }
                : group,
          ),
      };
    });
  }

  function removeService(
    groupIndex: number,
    serviceIndex: number,
  ) {
    setData((current) => {
      if (!current) return current;

      return {
        ...current,
        groups:
          current.groups.map(
            (group, index) =>
              index === groupIndex
                ? {
                    ...group,
                    items:
                      group.items.filter(
                        (
                          _,
                          itemIndex,
                        ) =>
                          itemIndex !==
                          serviceIndex,
                      ),
                  }
                : group,
          ),
      };
    });
  }

  function addGroup() {
    setData((current) => {
      if (!current) return current;

      return {
        ...current,
        groups: [
          ...current.groups,
          {
            title: "",
            items: [
              {
                ...EMPTY_SERVICE,
              },
            ],
          },
        ],
      };
    });
  }

  function removeGroup(
    groupIndex: number,
  ) {
    if (
      !window.confirm(
        "Remove this category and all services inside it?",
      )
    ) {
      return;
    }

    setData((current) => {
      if (!current) return current;

      return {
        ...current,
        groups:
          current.groups.filter(
            (_, index) =>
              index !== groupIndex,
          ),
      };
    });
  }

  async function save() {
    if (!data || saving) return;

    setSaving(true);

    try {
      const res = await fetch(
        "/api/admin/services",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify(data),
        },
      );

      const result =
        await res.json().catch(
          () => ({}),
        );

      if (!res.ok) {
        throw new Error(
          result.error ||
            "Could not save services.",
        );
      }

      setData(result);

      showToast(
        "Services and prices saved.",
        true,
      );
    } catch (error) {
      showToast(
        (error as Error).message,
        false,
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="sa-loading">
        Loading services…
      </p>
    );
  }

  if (!data) {
    return (
      <div className="sa-error">
        Services could not be loaded.
      </div>
    );
  }

  const serviceCount =
    data.groups.reduce(
      (total, group) =>
        total + group.items.length,
      0,
    );

  return (
    <>
      <div className="sa-breadcrumb">
        <Link href="/admin">
          Dashboard
        </Link>
        <span>/</span>
        <span>
          Services & prices
        </span>
      </div>

      <div className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">
            Salon
          </p>

          <h1 className="sa-h1">
            Services & prices
          </h1>

          <p className="sa-subtitle">
            Manage treatments, duration
            and prices shown on your
            website.
          </p>
        </div>

        <div className="sa-page-header__actions">
          <a
            className="sa-btn sa-btn--ghost"
            href={data.pagePath || "/"}
            target="_blank"
            rel="noopener noreferrer"
          >
            View services
          </a>

          <button
            className="sa-btn sa-btn--primary"
            disabled={saving}
            onClick={() =>
              void save()
            }
          >
            {saving
              ? "Saving…"
              : "Save changes"}
          </button>
        </div>
      </div>

      <div className="sa-stats">
        <div className="sa-stat">
          <div className="sa-stat__label">
            Categories
          </div>
          <div className="sa-stat__value">
            {data.groups.length}
          </div>
          <div className="sa-stat__desc">
            Service groups
          </div>
        </div>

        <div className="sa-stat">
          <div className="sa-stat__label">
            Services
          </div>
          <div className="sa-stat__value">
            {serviceCount}
          </div>
          <div className="sa-stat__desc">
            Active price rows
          </div>
        </div>
      </div>

      <section className="sa-card">
        <div className="sa-card__header">
          <div>
            <span className="sa-card__eyebrow">
              Price list
            </span>
            <h2>
              Website heading
            </h2>
          </div>
        </div>

        <div className="sa-form-grid">
          <div className="sa-field">
            <label htmlFor="services-heading">
              Heading
            </label>

            <input
              id="services-heading"
              value={data.heading}
              onChange={(event) =>
                setData({
                  ...data,
                  heading:
                    event.target.value,
                })
              }
            />
          </div>

          <div className="sa-field">
            <label htmlFor="services-intro">
              Introduction
            </label>

            <textarea
              id="services-intro"
              value={data.intro}
              onChange={(event) =>
                setData({
                  ...data,
                  intro:
                    event.target.value,
                })
              }
            />
          </div>
        </div>
      </section>

      <div className={styles.groups}>
        {data.groups.map(
          (group, groupIndex) => (
            <section
              className="sa-card"
              key={groupIndex}
            >
              <div
                className={`${styles.groupHeader} sa-card__header`}
              >
                <div className={styles.groupTitle}>
                  <span className="sa-card__eyebrow">
                    Category{" "}
                    {groupIndex + 1}
                  </span>

                  <input
                    aria-label={`Category ${
                      groupIndex + 1
                    } name`}
                    value={group.title}
                    placeholder="e.g. Haircuts"
                    onChange={(event) =>
                      updateGroup(
                        groupIndex,
                        {
                          title:
                            event.target
                              .value,
                        },
                      )
                    }
                  />
                </div>

                <button
                  type="button"
                  className="sa-btn sa-btn--ghost sa-btn--sm"
                  onClick={() =>
                    removeGroup(
                      groupIndex,
                    )
                  }
                >
                  Remove category
                </button>
              </div>

              <div className={styles.services}>
                {group.items.map(
                  (
                    service,
                    serviceIndex,
                  ) => (
                    <article
                      className={
                        styles.service
                      }
                      key={serviceIndex}
                    >
                      <div
                        className={
                          styles.serviceMain
                        }
                      >
                        <div className="sa-field">
                          <label>
                            Service
                          </label>

                          <input
                            value={
                              service.name
                            }
                            placeholder="Haircut"
                            onChange={(
                              event,
                            ) =>
                              updateService(
                                groupIndex,
                                serviceIndex,
                                {
                                  name:
                                    event
                                      .target
                                      .value,
                                },
                              )
                            }
                          />
                        </div>

                        <div className="sa-field">
                          <label>
                            Description
                          </label>

                          <input
                            value={
                              service.description
                            }
                            placeholder="Optional"
                            onChange={(
                              event,
                            ) =>
                              updateService(
                                groupIndex,
                                serviceIndex,
                                {
                                  description:
                                    event
                                      .target
                                      .value,
                                },
                              )
                            }
                          />
                        </div>
                      </div>

                      <div
                        className={
                          styles.serviceMeta
                        }
                      >
                        <div className="sa-field">
                          <label>
                            Duration
                          </label>

                          <input
                            value={
                              service.duration
                            }
                            placeholder="45 min"
                            onChange={(
                              event,
                            ) =>
                              updateService(
                                groupIndex,
                                serviceIndex,
                                {
                                  duration:
                                    event
                                      .target
                                      .value,
                                },
                              )
                            }
                          />
                        </div>

                        <div className="sa-field">
                          <label>
                            Price
                          </label>

                          <input
                            value={
                              service.price
                            }
                            placeholder="595"
                            onChange={(
                              event,
                            ) =>
                              updateService(
                                groupIndex,
                                serviceIndex,
                                {
                                  price:
                                    event
                                      .target
                                      .value,
                                },
                              )
                            }
                            onBlur={(event) => {
                              const raw =
                                event.target.value.trim();

                              const numeric = raw
                                .replace(/^från\\s+/i, "")
                                .replace(/\\s*kr$/i, "")
                                .replace(/\\s+/g, "")
                                .replace(",", ".");

                              if (!/^\\d+(?:\\.\\d+)?$/.test(numeric)) {
                                return;
                              }

                              const amount =
                                Number(numeric);

                              if (!Number.isFinite(amount)) {
                                return;
                              }

                              const formatted =
                                new Intl.NumberFormat(
                                  "sv-SE",
                                  {
                                    maximumFractionDigits: 2,
                                  },
                                ).format(amount);

                              updateService(
                                groupIndex,
                                serviceIndex,
                                {
                                  price:
                                    `från ${formatted} kr`,
                                },
                              );
                            }}
                          />
                        </div>

                        <button
                          type="button"
                          className={
                            styles.removeService
                          }
                          aria-label="Remove service"
                          title="Remove service"
                          onClick={() =>
                            removeService(
                              groupIndex,
                              serviceIndex,
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    </article>
                  ),
                )}
              </div>

              <button
                type="button"
                className="sa-btn sa-btn--ghost sa-btn--sm"
                onClick={() =>
                  addService(
                    groupIndex,
                  )
                }
              >
                + Add service
              </button>
            </section>
          ),
        )}
      </div>

      <div className={styles.bottomActions}>
        <button
          type="button"
          className="sa-btn sa-btn--ghost"
          onClick={addGroup}
        >
          + Add category
        </button>

        <button
          type="button"
          className="sa-btn sa-btn--primary"
          disabled={saving}
          onClick={() =>
            void save()
          }
        >
          {saving
            ? "Saving…"
            : "Save changes"}
        </button>
      </div>

      {toast ? (
        <div
          className={`sa-toast ${
            toast.ok
              ? "sa-toast--success"
              : "sa-toast--error"
          }`}
        >
          {toast.msg}
        </div>
      ) : null}
    </>
  );
}
