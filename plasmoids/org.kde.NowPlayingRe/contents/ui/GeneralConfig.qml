import QtQuick 2.12
import QtQuick.Controls 2.12
import QtQuick.Layouts 1.11
import org.kde.plasma.core 2.0 as PlasmaCore

Item {
    id: configRoot

    signal configurationChanged

    QtObject {
        id: backgroundValue
        property var value
    }

    property alias cfg_opacity: opacitySpinBox.value

    property string cfg_preferredSource
    property alias cfg_alignment: alignmentsComboBox.currentIndex
    property alias cfg_background: backgroundValue.value

	property string cfg_fontFamily

    property var alignments: ["Left", "Right"]

    ColumnLayout {
        spacing: units.smallSpacing * 2


        RowLayout{
            Label {
                text: i18n("Background:")
            }
            ComboBox {
                textRole: "text"
                valueRole: "value"
                id: backgroundComboBox
                model: [
                    {text: i18n("None"), value: 0},
                    {text: i18n("Standard"), value: 1},
                    {text: i18n("Translucent"), value: 2},
                    {text: i18n("Shadowed"), value: 4}
                ]
                onActivated: backgroundValue.value = currentValue
                Component.onCompleted: currentIndex = indexOfValue(backgroundValue.value)
            }
        }

        RowLayout{
            Label {
                text: i18n("Opacity percent")
            }
            SpinBox {
                id: opacitySpinBox
                from: 0
                to: 100
            }
        }

        RowLayout{

            Label {
                text: i18n("Preferred media source")
            }

            ListModel {
                id: sourcesModel
                Component.onCompleted: {
                    var arr = []
                    arr.push({
                                "text": cfg_preferredSource
                            })
                    var sources = dataSource.sources
                    for (var i = 0, j = sources.length; i < j; ++i) {
                        if (sources[i] === cfg_preferredSource) {
                            continue
                        }
                        arr.push({
                                    "text": sources[i]
                                })
                    }
                    append(arr)
                }
            }

            ComboBox {
                id: sourcesComboBox
                model: sourcesModel
                focus: true
                currentIndex: 0
                textRole: "text"
                onCurrentIndexChanged: {
                    var current = model.get(currentIndex)
                    if (current) {
                        cfg_preferredSource = current.text
                        configRoot.configurationChanged()
                    }
                }
            }
        }

        RowLayout{
            Label {
                text: i18n("Font")
            }
            ComboBox{
                id: fontFamilyComboBox
                model: Qt.fontFamilies()
                onCurrentIndexChanged: {
                    var current = Qt.fontFamilies()[currentIndex]
                    cfg_fontFamily=current
                    configRoot.configurationChanged()
                }
            }
        }

        RowLayout{

            Label {
                text: i18n("Alignment")
            }

            ListModel {
                id: alignmentsModel
                Component.onCompleted: {
                    var arr = []
                    for (var i = 0, j = alignments.length; i < j; ++i) {
                        arr.push({
                            "label": alignments[i],
                            "value": i
                        })
                    }
                    append(arr)
                }
            }

            ComboBox {
                id: alignmentsComboBox
                model: alignmentsModel
                focus: true
                textRole: "label"
            }
        }

    }

    PlasmaCore.DataSource {
        id: dataSource
        engine: "mpris2"
    }
}
