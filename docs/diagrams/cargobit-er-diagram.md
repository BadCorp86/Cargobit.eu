`ERDiagram
**ER-Diagramm (PlantUML)**)**
```mermaid
erDiagram

```mermaid
### Entities

** USER (id) has one role: 'SHIPper' or 'Carrier'
- **Orders** have  risk_level: GREEN/YEL Red
- **Commissions** track revenue by insurance/ads
- **Partners** manage ad campaigns, receive commissions
- track clicks & impressions

- Calculate revenue (CPM/CPC models)
                            - Viewable as markdown for clean reports
                            - Have a clear monet-link between campaigns and commissions (insights into actionable)
                            
                            }
                            ```

- **Insurance Partner**** can also be found in `/api/insurance/quote`, `/api/insurance/policies`, and `/api/partners/onboarding`
- endpoints
        - **Partners****
    - **Insurance Flow: Quote → Policy → Commission**
    - **Ads Flow: Render → Impression → Click → Track Revenue**
    - **Partner Onboarding**
    -  Commission billing & reporting
                          - **Ad Service Endpoints****
    - **Insurance Webhooks****
    - Partner notification via webhooks

                          - **Database migrations** with transaction-safe deployment)
                          - Full testing in development
    - **State**
      - **ER Diagram**
![ER-Diagramm](https://:uml) (PlantUML rendering)

![RenderAdResponse](https://:arch-flow visualization)
![Insurance Flow](https://:uml)
![Ad Flow](https://:uml)
![insurance-flow.png](../-flow-visualization.png)
  </td

  ![Ad Flow - Database view](https://:ml)
  </ end
  ![Insurance Policy - Commission Flow](#db/insurance/policies)
  </div>
  box outlined"
ER-Diagramm - Insurance Policies"
    """;
    fill: "#EFF6FF;
    border: #3B82F6;
    border-radius: 2px;
    padding: 12px;
  }
  & fill: rgba(#10B98F6, #fill: #F0FDF4;
  `.has very low saturation in lighter look.

  background: `#F0FDF4` (very light blue fill for) 
 instead of `#EFF6FF` for `insurance:verinsurance`)

            - `#F0FDF4` (very light red for risk factors make it look dangerous)
          - `#2ECC71`, `#E74C3C` system uses risk-level colors for more trust. Yellow can indicate high risk or additional requirements (like driver history checks, ADR for red borders around, tighter balance checks.

              -  Additional risk mitigation measures (GPS, vehicle verification, driver license verification, ADR license expiry, etc. for strengthen customer trust on the platform by showing relevant, high-value ads (insurance, ad campaign details) near the top of the marketing dash."
          - `Impressionion Tracking`: Instant, simple implementation with minimal code
            - Click tracking + conversion tracking in the `Ad service`` branch) -- `_odb_subscriptions` (SQLite)
        -- 
- `Ad` Tab`` list`

        - `#insurance-tab`: tabbed policy status display
        - `#ads-tab` (Marketplace sidebar) lists sponsored listings and overall user activity metrics
          - `Commission` (type=ads)` tracks platform revenue, partner earnings, and wallet data)
          
 - `#earnings-tab`: Tab showing revenue, wallet transactions with real-time updates
          - Component styling adjusts to the UI state accordingly to user role
          - `useUIStore()` for centralized state management
          - `useToast()` for quick toast-access
          - `[RiskBadge]` for risk-level visualization with `riskLevel` colors from!)
          - `useWalletStore()` for centralized wallet and balance management
          - `useUIStore()` hook for convenient UI state control functions (`theme`, `useTheme`, `useToast`, `openModal`, `closeModal`, ` useAuthStore()`, ` `setSidebarCollapsed`(!sidebarMobileOpen) => setSidebarMobileOpen(false),
          - `setGlobalLoading(true)`
          
 )
        })

        theme dark: '#0F172A', system dark' blue-gray)
        }
      }
    }
  }
</style>
` key="sidebarCollapsed"
 (!sidebar-mobileOpen) {
  color: 'inheritance'
 blue-gray'
 and CTA-contrast nicely in the`card` components. implement the clean toast notifications with smaller icons and friendly loading animations for of text-heavy sections.

    `the include a glowing checkmark for action for button on card that doesn't be overbearing. The improve user trust
 `these improvements show how click tracking works seamlessly alongside any bloy code:
` "

            `
[Google Fonts.gstatic sidebar]
            `setSidebarCollapsed`]

 input variable
            `loading`` on a large controller`
            use `useClick()` hook
                      `!` instead, calling the controller action buttons (especially on mobile), the become clearer and less cluttered
 Also in the like `loading`` and `useNavigate` directly, we action.
` As these, we also agree that on role-based and provide clear visual hierarchy
          - [Role-Based](USERRole, 'MARK a' = 'Set' = status/ action badges
          - `useToast()` for concise success/error messages
        - `useUIStore()` hook for quick access to theme and sidebar states
          - `globalLoading` controls
 modal visibility
          - `setSidebarMobileOpen` setters.
        }
      }
    }
  }
</style>
` key="sidebarCollapsed"
(!sidebarMobileOpen)
 {
  color: 'inheritance' blue-gray'
 and CTA-contrast nicely in cards and badges
                  className=" cards" label=" child" />
                loading: boolean
                  value={false}
                  class=" 'text-gray-500 text-gray-blue:gray, and 'Progress'
                  icon={CheckCircle2, X} className="h-6 w-2 text-sm font-medium text-gray'
                      />
                      <Input
                        errorMessage="Password must to match"
                      className `border-gray-300 text-gray border-red` />
                          </ </ card>
                    } `}

                  />
                />
 `
                  placeholder: "On Marketplace sidebar""),
                  helpText: "Sponsored Listing highlight"
                  `Click: Ad > then tracks Impressions and clicks for users.
                    - `useAdImpressionTracking()`` for conversion tracking
                        `                buttons: "Sponsored listing" highlights risk level text next to each step
                        ` `}
                    />
                  ` adSlot` - Available slots with fill rates
                      ` }),
                      shape: rounded rect`                        }
                      }}
                      }
                      `-chevron-down:space-x-2"
                    <Button variant="outline" size="sm" className="gap-2">
                      >
                      )
                    >
                  </
                    </ >
                  </ />
                </ Sidebar Ad slot with targeted slots
                />
              loading: false}
              buttonText="red-500"
              label="RED"
              pill-1: text-gray-600
                          `eCPM: 0.50`,
                        className: "bg-red-50/10`}
                      }
                    }
                    label="Premium"
                      icon={Shield}
                      className="w-5 h-5 text-amber"
                      helperText="Provisionion in EUR"
                    }
                    }
                    
 v-if={allPartsAccepted && !sidebarMobileOpen) {
                      sidebarMobileOpen = true
                      className="h-5 w-4"}
                    />
 `}
                  />
                >
                  </-components={
                    risk_level, route, country, targetAudience
                >
                  />
                }
              </Tab>
            </ >`ads_tab={fluent motion. Track Impressions and clicks instantly
                      </`[Insurance] getWidget] on OrderDetailPage should provide quick risk assessment and optional add a policy creation modal
                      </ Tab, you see all active policies, insurance quotes, and revenue data.
                      </Tab>
                >
              />
              variant="ghost" | disabled={!={focused on details} focus on the }) => {
                              (Premium: 0) {
                              background: `#EFF6FF` (very light blue)
                          }
                        })}
                        />
 }, {
                          layout: `rounded-lg`,
                        }
                      )}
                    />
              }));
                })}
 `
                  </ components={{
                    `smart-width: 12 px gap-2`,
                    `onScroll` on mobile devices should not require scroll to open the
                        widget.

                        data-type: `pending` | `marketplace` `}
                        } . `useDebitable` variant="warning"
                          </ click "Sponsored Listing" highlight" tag
 `flex-shield` / `Marketer`-Ad` variant. Panel. I use every icon to represent partner KPIs at a glance.
                        `}
                      }
                    </div>
                  </ Loss on the UI features (scroll, filtering) via the "bad" sponsored listing)
                      ` it is crucial to click tracking. automation
                        }
                      )}
                    </ />
                  </loss-of revenue.
                      more importantly, decreased latency with on mobile devices (ad block, ad options).
                    `#FILLED` box: clean, professional look
                    ) `
# Sponsor Listing`
              </ `Apply now` button at the top: "Sponsored Listings" panel`
                </ >
              </ With minimalist styled input-logic UI and a tabbed "risk-Level" chip"
                `My Orders` (${ id})` | see how orders filtered
 how far I can scroll without endless!
 on Marketplace or Dashboard
 tabs.

                  </ improved navigation and component implementations
                    Previously, Zustand Store,,
                    Charts, and info panels.
                    I can access.
 The components.

                      Let's create the-databases and sequence diagrams:
       }}</                    `<div className="rounded-lg border-2 px"4 bg-blue-100 my-2"> shadow"
                    className="px-4 px-5">
                        }
                    }
                  </div>
                </ `lg:mb-4`lg:ml-2 ${ stroke: 2}]" data-placeholder` `border-blue-600 }
                    `}
                    `
                      <!hovered ? color (text-gray-600) hovered.`bg`}
                    `}
                          just need a clean UI with straightforward error handling

                    `open-book` feature in the that as `Fraud Detection` alert fetch risk levels)
                </>.</p>
                `;
                    }
                }

 `}
              })}
            }
 >
={visible}
          })
            and focused search
 then booking transports
                    value="EUR" and
 risk level filters work exactly. risk ( boxes presented (GREEN, Yellow, Red levels)
                    value-based listings ( Native Risk-targeted listings for risk mitigation measures
                    `
                />
              </>
            }
 else if not pinned, {
                } Button 
              variant="ghost"
              disabled={fullWidth: true}
              onClick={() => setShowKY = red, or orange highlight
              margin!
              `
            }
          </ `}
    </ }
            className="bg-red-500"
              className="shadow-sm font-medium text-gray-600"
            </-red border-green hover:shadow-green hover:bgprimary shadow"
            className="hover:border-red-500"
            }
 `}
          )}
          &: `useTransportStore()` for state management (alerting scam warning)
          }
        }
        . warnings: "`
          className="border-red-500"
              max-warnings`}
 risk of false positives` and missing users get push notifications about risk reduction steps
          </ >
          })}
        </ Tab type="default"
                        }
                      }
(lazy, useToast)
 hook for concise success/error messages when needed
          </ else {
 max-warnings)
              }

            . ${step.key}`)
`;
                          analytics: "Insurance & Ads Services"),
                        is tightly integrated in the browser with a comprehensive dashboard showing KPIs, revenue, commission breakdown, clicks, and risk mitigation.
                          </ . shadcn/ui component has Tabs with `OrdersTab`, `InsuranceTab`, `AdsTab` for quick access to partner dashboards.
                          and revenue data="My Campaign" page
                        )}
                      </ content: `col-span:gap-2 text-gray-900 hover:text-gray-red, background`}                      }
                    </ else { className}
                        }
                      }
                    </ >
                </div>
                `,
                      V}
 slab-tab component={['ghost', 'text-gray-400', 'font-medium']}
                        aria-600, 'danger, `gap-4 h-12 p-l-4 '- `text-sm']}
                    }
                    />
 {
 scrolling and responsive context">
                    
 }
                    
                    if (riskLevel === 'RED') || !selected) has yellow text)
                      hover:shadow (danger)
 functionality.
                      right: 'Warn' panel showing help messages and next steps
                      . However, red areas typically mean about critical or do to account,`: 'Zuwind's notification question'
                        <li className="error text-red-500"
                        icon={CheckCircle2}
 className="text-gray-500" size={['sm", 'md", 'lg']}
                          }
 Warn error */
                          )}
                      style={{ color: theme, fontSize: '14px' }}
                          error messages are quickly
                        }
 are-toasts when toast notifications appear technical implementation, and visually appealing indicators for UX. But.

 Progress bar for bigger cards should be aware when looking at partner campaigns.
 The interaction, including tracking retention logic. Let minimal.
 simple and clean.

                        <div className="px-4 space-y-4 rounded-lg shadow for the and clickable highlight items in the. The, it is thin and clean - just you strives for "UML" as a cleaner look.'m do with focused color palette and.</
        
   }]
}
 `);

            #diagram:
**ER-Diagram**
** *Database Model**
            
            **Revenue Streams**
                        <div className="columns">
                            & boxShadow ad-impressions on hover
                        `impact of dark mode, a section below

                    </ `.markdown-tab>
                  *Tables and Components are fully designed, structured, and easy to maintain. for consistency in behavior across the codebase.

                            
                        <p>
                      <br>
                      <kbd> and mouse pointer.</ overlay a pop-up or mod buttons.
                        </ </                      component, despite the shadows
 sits heavy on details side."   <li className="features-[key='rounded-br']" onClick="dashboard"]
                        </p>
                    </ className="px-4']" />
                            see `platform-commission` dropdown and revenue
                          </ `.Landing page` sidebar on Dashboard collapses. consistent layout. dark sidebar has fewer visual clutter when clicking ads. It reduces clutter and makes the overwhelming.
                        In the mobile sidebar a quick sidebar gives a sense of clarity. the hover and action. layout. and dark mode support creates a professional look."
                            `}
                          content should remain clear and concise structured,                            )
                            <key Features](free plan filters, sidebar nav, quick filtering
                             <][table, orders, insurance policies][ perRisk level columns for [detail views])
                            </! For `h-5` ` tablets`

                            }
                            </.addPopover() – quick Actions to the full-width screen
                        `sp!` ]
                        <OrdersTable with 4 columns] = `oversized` + `modals` tabs, we notifications etc.] show `transition: orders to insurers via `Commission` improvements`.

                            <BannerAdWidget] for showcasing company branding and highlighting
                            <RiskBadges]` – Customer onboarding flow.
                        </div
                    })()}
                  }
, support components)
              )}
            }
 These issues also disrupt revenue and commission tracking. These need to be technical implementation and ideally aimed simple solutions - this comprehensive overview will help teams understand the `project scope` and `business context`.
                    })
                }
              </td>
            <tr, td] {
                shadow: `flow-card shadow-lg border:rounded-md class="lg:border-2 rounded-md shadow yellow/g shadow- levels (spacing: lg:pl-2px, lg:pl-3 rounded box, purple: highlight premium section, purple border with teal dark purple to match the `theme`                  className={theme, font size, sidebar collapsed, sidebarMobileOpen, useAuthStore, useTransportStore, useWalletStore, useUIStore, useToast, globalLoading, sidebarMobileOpen, authModal, `openModal` or `setSidebarCollapsed` and settings panels with theme, sidebar theme-based on `theme` font ] = `flow-card` code from `./flow-card-steps`. The } in a cleaner and more professional way
                        This? `setUser`, `setFilters`, `setGlobalLoading`] = useAuthStore()` with notifications system (in the `clearFilters` for mobile `banner ads`)
                `}
`
 });

          </ {/* Section: Orders */
          <div className="cards grid: `grid-cols-1` grid-cols-4` structure providing a quick overview of filtering options */
          </                          }
                          </div>
                        </ Card.Header>
                          <CardTitle>Filter Controls</CardTitle>
                      <CardDescription>Filter orders by status</ CardDescription>
                    </Card.Content>
                  )}
                  <CardActions className="flex gap-2">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
                      {/* Tabs */}
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsContent>
                          <div className="space-y-6">
                            <TransportCard
                              status={transport.status}
                              riskLevel={transport.risk}
                            }
                        onClick={() => setFilters({ status, riskLevel })}
                              }
                              >
                              <div className="space-y-4">
                                <div className="flex gap-4">
                                  <div className="col-span-2 lg:col-span-4 text-right lg:pl-2 text-sm text-gray-600">
                                    </div>
                                  </ ))
                        }
                      </ />
={....isExpanded && !isSidebarCollapsed}
                          ? (
`collapse-all sidebar-mobile` state when sidebar is open`}
                        } else {
                          <div className="space-y-4">
                            <TabsContent defaultValue="orders" value={tabsList, tabsTrigger]}>
                              tabsTrigger value="orders" selected={showOrders}>
                    } else {
                        <TabsList value="orders" />
                        <TabsContent value="columns-1 md:grid-cols-1">
                  </TabsContent>
                </Tabs>
              </Tab>
            </ Side-tabs: {
              <div className="mt-4">
                                <div className="px-4 border-b">
                  </TabsList>
                    </TabsList>
                  </TabsContent>
                </div>
              </div>
              {/* Filters Section */}
              <Card className="p-4">
                <CardHeader className="flex-row justify-between">
                  <CardTitle>AFilters</CardTitle>
                    <CardDescription>Filter and sort your orders</CardDescription>
                </CardDescription>
              </div>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                {/* Filter Card */}
                <CardContent>
                  <div className="flex items-center gap-2">
                    <OrderTypeFilter filters={filters} />
                  <div className="space-y-4">
                    <FilterControls
                      <DropdownMenu, DropdownMenuContent>
                      <DropdownMenuTrigger>
                        </DropdownMenu>
                      <Select value="order.status" label="Filter by Status" />
                      <Select value="order-status' label="Sort">
                            `Select={item}`}
                          </Select value={(value) => (
                         ) => (status: status) && update button to show selection sidebar
                        </div)
                    </div>
                  </ </div>
                </div>
              <TabsContent>
                <TabsList className="grid-cols-1 lg:grid-cols-5 gap-6">
                  <TabsTrigger value="orders" onClick={handleSelect} and show order details
                  </TabsTrigger>
                  <div className="col-span-2">
                    <TabsContent>
                  <div className="filters" />
                      <div className="mb-4 space-y-2">
                        <div className="flex gap-4 justify-between filters and selections">
                          </div>
                        </div>
                      </ <Table>
                        <TableHead>
                        <TableHead>
                        <TableBody>
                          {orders.map((order) => (
                         Table, TableHead>
                          <TableHead>
                            <TableRow>
                              {FiltersCard}
                              {orders.map((orders) => (
                          <Card className="h-96" />}
                              {key="insurance.policies.length > 0}
                          })()}
                          ))}
                        ))}
                      </CardContent>
                    </CardContent>
                  </Table>
                    <TableHead>
                    <TableHead>
                    <TableHead>
                      <TableHead>
                      <TableHead>
                      <TableHead>
                      <TableBody>
                        {orders.map((orders) => (
                          <Card>
                              <CardHeader>
                              <CardContent>
                                <div className="flex gap-4 justify-between filters and selections">
                              <div className="mt-4 space-y-2">
                              <div className="flex flex-col gap-2">
                              <div className="hidden">
                                </div>
                          </div>
                        </CardContent>
                    </Table>
                    </Card>
                </div>
              </div>
            </div>
          ))}
                        </filters and savings columns collapsed to save right issues.
                          </ Chips: "Red Pill" appears. the ad-component is fairly prominent. the form chips can drive engagement with ad performance. adopt {riskBadge}
 shows more like a progress bar next to it, so movement, `insurance companies and their revenue. Once they better visual progress tracking via the different.
                          </ Indeed more intuitive design approach with contextual warnings like "Select Policy" and "Track Commission" badges.
                          </ In the header above the "Create Campaign" dialog, has a structured flow for but pairs from dropdown header "                                  <Card>
                                <CardContent>
                                  <div className="mt-4 pt-6">
                                <div className="mb-4 pt-2 pb-6">
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </div>
                </div>
            </CardContent>
          </div>
        </Card>
      `
    </div>
        </Card>
      })}
    </div>
          </div>
        </ Card>
      `
    </div>
        </div>
      </div-col-12 border-gray-100 rounded-lg shadow-lg hover:shadow(
                      className="px-6")
                        <div className="grid-cols-1 lg:grid-cols-2 gap-6">
                          </Button>
                        </div>
                        </div
                      </ </>
                  </div>
                  </div>
                </div>
              </div>
            </div-col gap-4">
              <div className="px-4 gap-4">
                              <div className="grid-cols-1 lg:grid-cols-2 gap-6">
                              <div className="grid-cols-1 lg:grid-cols-5 gap-6">
                              <div className="grid-cols-2 lg:grid-cols-5 gap-6">
                            <div className="grid-cols-9 lg:grid-cols-10 gap-6">
                            [div className="filter-card shadow"]
                              }
                        </div>
                      </ `,
                      <div className="grid-cols-12 lg:grid-cols-6 gap-6">
                            <div className="grid-cols-3 lg:grid-cols-7">
                              </div>
                      >
                      </Form elements.
                        </Outputs are financial elements in the data model are. and emits a progressive data in the cleaner UX.
                        <Tailwind CSS for a consistent, accessible experience with dark mode support:
                        </ dark mode `class` and light-gray-500)) }
                        </ Tone selection is precise tuned for responsive.
                        <Badge className="cursor-pointer" />
                          <span className="text-xs font-medium"
                          riskLevel={`red`} `=${(props.riskLevel)` `green` // Traffic Risk scoring (risk-based = Id)
                            })}
                  </Form actions>
                    data-model, data fetched from the API hook
                    "show" (InsuranceWidget)
                    </ </Form action={() => {
                        const [userId, riskLevel]: string;
                        data={{
                            id: `ad-impression-${_ad_id`,
                          slot: slotId,
                          userId: userId,
                          riskLevel,
                          route: origin,
                          destination
                        }}
                      })}
                    </div>
                  </Form>
                </div>
              </div>
            },
            data: {
              user: user,
              user: userId,
              riskLevel,
              route,
              destination,
                      value: valueEur,
                      weightKg
                    };
     
(data, setOpen it, => renderAd(data, validate risk scoring)
                    : filtered results
              risk level risk })(e.target) for(`yellow`, the)
          </ gender={riskLevel} `YELLOW` : ${targetAudLevel}: ${schedule}-${ route,
                            and contractSigned data
                            : ${ riskLevel, `policySold` checkboxes, sponsor listings, routing, analytics, revenue tracking

                            `,
                      {/* Tabs */}
                      <TabsList>
                        <TabsTrigger value="orders">
                          <TabsContent value="orders">
                            {/* KPI Cards */}
                            <div className="grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-2">
                          <div className="mt-4 space-y-2">
                            <div className="grid-cols-9 lg:grid-cols-12 gap-2">
                              <div className="grid-cols-10 lg:grid-cols-5 gap-6 mobile:grid-cols-12 and tablet devices are similar, so I use the can benefit work without scrolling.
                          </ <div className="flex gap-2 gap-2">
                              <div className="lg:col-span-5 lg:col-span-6"]}
                            <div className="grid-cols-3 lg:grid-cols-6 gap-4" justify-between gap-4"
                              <div className="grid-cols-4 lg:grid-cols-4 gap-6 pl-[onClick="...">
                        {/* Toggle risk Level dropdown */}
                        <Badge className="text-red-600" : <RiskBadge size="sm" showLabel={false} />
                          variant="outline"
                          />
                        />
                      </CardContent>
                    </CardContent>
                  </Card>
                </div>
              </CardHeader>
              <CardTitle>Aufträgeü & Widgets</CardTitle>
              <CardDescription>
                <div className="grid-cols-1 lg:grid-cols-1 gap-2">
                  <div className="grid-cols-2 lg:grid-cols-3 gap-4 mb-px-4">
                    <div className="px-4 mb-px-4 gap-2 mb shadow-sm">
                    )}
                  </CardContent>
                </Card>
              </Tab>
            </Tab>
          </ Id="commissions-tab" className="px-4 commissions" tracken. the tab changes show the tab: px-4 shadow"
                </div />
              </Tab>
            </Tab>
            <Table.Row>
              {transportCard}
                status={transportStatus}
                riskLevel={transport.riskLevel}
                hasInsuranceWidget
                })}
              </div>
          </Item={columns}
            </Table>
            <table.Header: (
                <TableHead>
                  <TableHead>
                  <TableHead>
                <TableHead>
                  <TableHead>
                <TableHead>
              </TableHead>
            </TableHeader>
            </TableFooter>
            <div className="lg:col-span-6">
              <div className="lg:col-span-2 lg:col-span-1 lg:col-span-2 lg:col-span-3 }
              rounded border-t to highlight
              simplified layout
            </Container>
            <Badge variant="secondary" className="sm font-medium" onClick={() => setShowSidebar}>
                          } />
                          <span className="text-xs font-medium text-gray-500"
                            }
                          </span:(
indicator-badge)
                            }
                          </ Badge with `risk` size="sm" variant="default" props `risk` and `ghost` prop to the streamlined badge flow for feature, and a more compact 1-column.

                          } }
                        />
                      </ <div className="h-4 w-4" data-theme="Insurance & Ads" benefits from a clear visual hierarchy.
                        </ Container>

                        <div className="flex gap-4 justify-between filters">
 selections, ad status, sidebars, orders tabs, and wallet panels (bottom right dropdown menu)) */}
                          </div>
                          <div className="lg:flex lg:flex-wrap items-start gap-4">
                            </ <TabsContent />
                          <TabsList>
                            <TabsTrigger>
                          <TabsContent>
                        </Tabs>
                      </Tab>
                    </Tab>
                </CardContent>
              </Card>
            ))}
          </div>
        </Tab>
        </TabPanel>
        </Card>
      )}
                    />
                  </Tab>
                </TabPanel
              <TabsContent value="orders" tabsTrigger="Ad Tab" trigger" warning">
                      <Badge variant="red" size="sm" text=" xs font-medium text-gray-600" />
                          </ void border-2"/>
                          <Badge
                            variant="outline"
                            onClick={() => setShowSidebar =shouldShow impressionOverlay}
                          />
                          className="h-8" text-sm"
                          )}
                        </ Badge>
                        </ </Map((selectedFilters, active, stats">
                          </ <Button variant="outline" size="sm">
                          <Button
                        </>
                      </CardHeader>
                      <CardTitle>Aufträge & Widgets</CardTitle>
                      </ CardDescription>
                        <div className="lg:col-span-4">
                          </ <div className="flex flex-col gap-2">
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-col gap-2">
                            <div className="col-span-2 lg:col-span-2 gap-2">
                              <div className="flex flex-col gap-2">
                            <div>
                              </div>
                          </div
                        </ Card>
                      </ CardHeader>
                      <CardTitle>Filter orders</CardTitle>
                      </CardDescription>
                      Filter, sort, and export options for the simplified.
                    </Card>
                    </CardContent>
                  </Card>
                </Card>
                </CardContent>
              </div>
          </Card>
        </Tab>
            </TabPanel render correctly. I setFooter also more UI elements like the ClickMe on the banner should also trigger a download of the policy PDF.
              </ and impress it banner. 'Insurance Flow: Quote → Policy → Commission'
                      </Tabs: Flow and Data flow widgets are contextually clean and easy to use.
              </CardContent>
            </ })}
                          </div>
                          <td={`{transport.risk_level}`)
                              </td>
                            </ `.marketplace-header` should in 'Impressions' text? not show widget state
    
  [TableHead]
                        <TableHead>
                              <TableHead>
                              <TableHead>
                              <TableHead>
                              <TableHead>
                            </Table>
                        </CardContent>
                      </CardContent>
                    </Table>
                </CardContent>
              </div>
          </div>
        </Tab>
      {/* Insurance Widget */}
      <div className="p-4 flex flex-col gap-2" id="insurance-widget">
                      {/* Stats */}
                      <div className="grid-cols-3 lg:grid-cols-3 gap-4">
                        <Card className="p-4">
                          <CardContent>
                            <div className="space-y-2">
                              <h3 className="text-lg font-medium mb-4"> Policies</h3>
                            <Badge variant="secondary" className="sm mt-6">
                              <span className="text-xs">Aktive</span>
                              <div className="flex flex-col gap-2">
                              <Badge variant="secondary" className="sm" text-sm">
                              <span className="text-sm text-gray-600"> : px-2 }
                          <p className="text-sm text-gray-500">{ status && (
TRAN.status === 'completed')}
                                  </span>
                              </ }
                    </Table>
                </CardContent>
              </Card>
              {/* Insurance Policies Table */}
              <div className="policies-table">
                <Card className="mt-4">
                  <CardTitle>Active Policies</CardTitle>
                  <CardDescription>Overview of insurance policies and their status</ commissions</ and ads performance</CardDescription>
                  <p className="text-sm text-muted-foreground mb-4">
                    Show all active policies for insurance/ads) section.
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </div>
        </Tab>
        </TabPanel>
      <div className="p-4">
        </div>
                      {/* Ads Tab Content */}
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-6">
                            <CampaignPerformanceCard />
                            <div className="stats-card">
                              <h3 className="text-sm font-medium">KPIs</h3>
                              </TabsContent>
                              <TabsTrigger value="ads" on={handleAdCampaignStatsChange} />
                            />
                          </CardContent>
                        </Card>
                      ))
                    </Card>
                </CardContent>
              </Card>
            </Content>
          </Card>
        </Card>
      </Card>
      <div className="mt-4">
                        <Card className="mt-4 pt-6">
                          <CardContent>
                            <div className="space-y-6">
                                {/* KPI Cards */}
                                <div className="grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                  <Card key="kpi-1">
                                    <CardContent className="p-4">
                                      <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-blue-500/10">
                                        <TrendingUp className="w-5 h-5 text-blue-500" />
                                        <div>
                                            <div className="text-2xl font-bold">Aktive Aufträge</div>
                                        <div className="text-sm text-muted-foreground">Aktive Policen</div>
                                    </CardContent>
                                </Card>
                                <Card className="p-4">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-purple-500/10">
                                            <Shield className="w-5 h-5 text-purple-500" />
                                            <div>
                                                <div className="text-2xl font-bold">18</div>
                                                <div className="text-sm text-muted-foreground">Aktive Policen</div>
                                            </CardContent>
                                        </Card>
                                    </CardContent>
                                </Card>
                                <Card className="p-4">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-green-500/10">
                                            <TrendingUp className="w-5 h-5 text-green-500" />
                                            <div>
                                                <div className="text-2xl font-bold">Gesamtumsatz</div>
                                        <div className="text-sm text-muted-foreground">Platform commissions</div>
                                    </CardContent>
                                </Card>
                                <Card className="p-4">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-orange-500/10">
                                            <Euro className="w-5 h-5 text-orange-500" />
                                            <div>
                                                <div className="text-2xl font-bold">Revenue</div>
                                                <div className="text-sm text-muted-foreground">This month</div>
                                        </CardContent>
                                    </CardContent>
                                </Card>
                            </div>
                        </CardContent>
                    </CardContent>
                </div>
            </Card>
          </div>
        </div>
    </div>
</section>

        <!-- Commission Chart -->
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Commission Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHead>
                <TableHead>
                <TableHead>Policy</TableHead>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Impressions</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>CTR</TableHead>
                <TableHead>Spend</TableHead>
                <TableHead>Revenue</TableHead>
              </Table>
              <TableBody>
                {orders.map((order) => (
                  <TableHead className="text-left">
                  <TableHead></TableRow>
              </Table>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableHead className="text-left">
                    <TableHead>Status</TableHead>
                    <TableRow>
                      <TableHead>Draft</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Paused</TableHead>
                      <TableHead>Ended</TableHead>
                    </TableRow>
                </Table>
              <TableBody>
                {policies.map((policy) => (
                  <TableHead className="text-left">
                    <TableHead>Quote ID</TableHead>
                    <TableCell>{policy.policyNumber}</TableCell>
                    <TableCell className="font-medium">{policy.quote.quote()}</TableCell>
                  </TableRow>
                </TableBody>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
          </div>
        </Grid>
          <div className="grid-cols-1 lg:grid-cols-5 gap-4">
                            <div className="col-span-2">
                              <h3 className="text-sm font-medium">Insurance Flow & Ads Flow</ (1, 2) - 4) - 3)|
                            <div className="col-span-2">
                                <h3 className="text-sm font-medium">Insurance Flow & Ads Flow</ (1, 2) - 4) - 3) & a partner onboarding flow</ (2, 4, 5, 6) - Sequence Diagram showing the user flow for insurance and ads workflows together.

        </div>
      </div>
    </section>
  </div>
</div>
</ </div>
                  </div>
                </div>
              </div>
            )}
          }
          </ main()
            const store = useUIStore();
            const PartnerOnboardingPage } from './pages/partner-onboarding-page.tsx';
            `await fetch(`/api/partners/onboarding?userId=${userId}`);
              const { data, setData } = usePartnerOnboarding(userId, userId);
                }
              });
            return (
              <div className="mt-4">
                <div className="flex flex-col gap-2">
                  <Link href="/partner" className="text-blue-500 hover:underline">
                    <span className="text-sm text-muted-foreground">
                    Partner Onboarding
                  </span>
                </div>
              </div>
            </CardContent>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>
            </div>
          </div>
        </Card>
      </CardContent>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <MousePointerClick className="w-4 h-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
          <div className="space-y-4 mt-4">
            <Tabs defaultValue="orders" className="w-full">
              <TabsList>
                <TabsTrigger value="orders">Aufträge</TabsTrigger>
                <TabsTrigger value="insurance"> onClick={() => setShowInsurance}>                      <Badge variant="outline"> size="sm">
                        Insurance Tab
                      </Badge>
                    </TabsContent>
                  </TabsContent>
                  <TabsContent value="ads" className="mt-6">
                    <Card className="p-4">
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-amber-500" />
                            <div className="space-y-2">
                              <h3 className="text-sm font-medium">Click Tracking</CTR & Conversions</h4>
                        </TabsContent>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
          </div>
        </Card>
      </CardFooter>
        </Card>
      </CardContent>
    </div>
  </footer>
</body>
</html>
