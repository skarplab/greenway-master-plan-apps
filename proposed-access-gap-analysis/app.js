require([
    "esri/portal/Portal",
    "esri/identity/OAuthInfo",
    "esri/identity/IdentityManager",
    "esri/portal/PortalQueryParams",
    "esri/WebMap",
    "esri/views/MapView",
    "esri/widgets/LayerList",
    "esri/widgets/Expand",
    "esri/layers/FeatureLayer",
    "esri/widgets/FeatureTable",
    "esri/core/watchUtils"
  ], function (Portal, OAuthInfo, esriId, PortalQueryParams, WebMap, MapView, LayerList, Expand, FeatureLayer, FeatureTable, watchUtils) {
    
    // AUTHENTICATION
    var personalPanelElement = document.getElementById(
        "personalizedPanel");
      var anonPanelElement = document.getElementById("anonymousPanel");
      var userIdElement = document.getElementById("userId");

      var info = new OAuthInfo({
        // Swap this ID out with registered application ID
        appId: "VchNV5mIbOBwksHv",
        // Uncomment the next line and update if using your own portal
        portalUrl: "https://ral.maps.arcgis.com",
        // Uncomment the next line to prevent the user's signed in state from being shared with other apps on the same domain with the same authNamespace value.
        // authNamespace: "portal_oauth_inline",
        popup: false
      });
      esriId.registerOAuthInfos([info]);

      esriId.checkSignInStatus(info.portalUrl + "/sharing").then(
        function() {
          drawMap();
        }
      ).catch(
        function() {
          // Anonymous view
          anonPanelElement.style.display = "block";
          personalPanelElement.style.display = "none";
          console.log('some error')
        }
      );

      document.getElementById("sign-in").addEventListener("click", function() {
        // user will be redirected to OAuth Sign In page
        esriId.getCredential(info.portalUrl + "/sharing");
      });

      document.getElementById("sign-out").addEventListener("click",
        function() {
          esriId.destroyCredentials();
          window.location.reload();
        });
    
    // APPLICATION
    function drawMap(){

        let selectedFeature, id;
        const features = [];
    
        const webmap = new WebMap({
          portalItem: {
            id: "d3871651d69a42fbbb3da290a850c3d8"
          }
        });
    
        const view = new MapView({
          map: webmap,
          container: "viewDiv",
          popup: {
            dockEnabled: true,
            dockOptions: {
              buttonEnabled: false,
              breakpoint: false
            }
          }
        });
    
        // When view is ready, find feature layer and set title and outFields
        view.when(function () {


            // Layer widget

            const layerList = new LayerList({
                view: view,
                listItemCreatedFunction: function (event) {
                    const item = event.item
                    if (item.layer.type != "group") {
                        item.panel = {
                            content: "legend",
                            open: true
                        }
                    }
                },
                container: document.createElement("div")
            })
            

            const layerListExpand = new Expand({
                view: view,
                content: layerList
            })

            view.ui.add(layerListExpand, 'top-left')


            const tableLayers = {
                "ten_minute_walk": {
                    id: "1763f8e640b-layer-7",
                    title: "Newly Served within a 10 Minute Walk"
                },
                "five_minute_walk": {
                    id: "1763f8e640b-layer-8",
                    title: "Newly Served within a 5 Minute Walk"
                },
            }

            console.log(webmap.allLayers)
          const featureLayer = webmap.findLayerById(tableLayers["ten_minute_walk"].id);
          featureLayer.title = tableLayers.ten_minute_walk.title;
          featureLayer.outFields = ["*"];
    
          // Get references to div elements for toggling table visibility
          const appContainer = document.getElementById("appContainer");
          const tableContainer = document.getElementById("tableContainer");
          const tableDiv = document.getElementById("tableDiv");
    
          // Create FeatureTable
          const featureTable = new FeatureTable({
            view: view, // make sure to pass in view in order for selection to work
            layer: featureLayer,
            fieldConfigs: [
              {
                name: "LOCATION",
                label: "Location",
                direction: "asc"
              },
              {
                name: "population",
                label: "Population"
              },
              {
                name: "mean_lap_score",
                label: "Land Acquisition Prioritization - Mean"
              }
            ],
            container: document.getElementById("tableDiv")
          });
    
          const attributeTblRadios = document.querySelectorAll('input[type=radio][name="feature-table"]')
          attributeTblRadios.forEach(radio => radio.addEventListener('change', () => {
            selectedTableLayer = tableLayers[radio.id]
            console.log(selectedTableLayer)
            toggleAttributeTable(featureTable, selectedTableLayer.id, selectedTableLayer.title)
          }))

          function toggleAttributeTable(table, layerId, layerTitle){
              let fl = webmap.findLayerById(layerId)
              fl.title = layerTitle
              table.layer = fl
              table.fieldConfigs = [
                {
                  name: "LOCATION",
                  label: "Location",
                  direction: "asc"
                },
                {
                  name: "population",
                  label: "Population"
                },
                {
                  name: "mean_lap_score",
                  label: "Land Acquisition Prioritization - Mean"
                }
              ]
              table.refresh()
          }

          // Add toggle visibility slider
          view.ui.add(document.getElementById("mainDiv"), "top-right");
    
          // Get reference to div elements
          const checkboxEle = document.getElementById("checkboxId");
          const labelText = document.getElementById("labelText");
    
          
          // Listen for when toggle is changed, call toggleFeatureTable function
          checkboxEle.onchange = function () {
            toggleFeatureTable();
          };
    
          function toggleFeatureTable() {
            // Check if the table is displayed, if so, toggle off. If not, display.
            if (!checkboxEle.checked) {
              appContainer.removeChild(tableContainer);
              labelText.innerHTML = "Show Feature Table";
            } else {
              appContainer.appendChild(tableContainer);
              labelText.innerHTML = "Hide Feature Table";
            }
          }
    
          featureTable.on("selection-change", function (changes) {
            // If row is unselected in table, remove it from the features array
            changes.removed.forEach(function (item) {
              const data = features.find(function (data) {
                return data.feature === item.feature;
              });
            });
    
            // If a row is selected, add to the features array
            changes.added.forEach(function (item) {
              const feature = item.feature;
              features.push({
                feature: feature
              });
    
              // Listen for row selection in the feature table. If the popup is open and a row is selected that is not the same feature as opened popup, close the existing popup.
              if (
                feature.attributes.OBJECTID !== id &&
                view.popup.visible === true
              ) {
                featureTable.deselectRows(selectedFeature);
                view.popup.close();
              }
            });
          });
    
          // Watch for the popup's visible property. Once it is true, clear the current table selection and select the corresponding table row from the popup
          watchUtils.watch(view.popup, "visible", (graphic) => {
            selectedFeature = view.popup.selectedFeature;
            if (selectedFeature !== null && view.popup.visible !== false) {
              featureTable.clearSelection();
              featureTable.selectRows(view.popup.selectedFeature);
              id = selectedFeature.getObjectId();
            }
          });
        });
    }
  });