package mos.management.dashboard.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;

/** option_groups: Size, Temperature, Ice level, Sweetness, Add-ons... (FR-26). */
@Entity
@Table(name = "option_groups")
public class OptionGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "group_id")
    private Long id;

    private String name;

    @Convert(converter = SelectionType.Jpa.class)
    private SelectionType selectionType;

    @Column(name = "is_required")
    private boolean required;

    private short maxSelect;
    private int sortOrder;

    /** Only applies to iced drinks (the ice level group, BR-01). Not in SA. */
    private boolean needsIcedDrink;

    /** "Less" reads "Less ice" in order lines. Not in SA. */
    private String summaryNoun;

    @OneToMany(mappedBy = "group", cascade = CascadeType.ALL)
    @OrderBy("sortOrder ASC, id ASC")
    private List<MenuOption> options = new ArrayList<>();

    protected OptionGroup() {
    }

    public OptionGroup(String name, SelectionType selectionType, boolean required, int maxSelect, int sortOrder) {
        this.name = name;
        this.selectionType = selectionType;
        this.required = required;
        this.maxSelect = (short) maxSelect;
        this.sortOrder = sortOrder;
    }

    public boolean isMultiple() {
        return selectionType == SelectionType.MULTIPLE;
    }

    /** "Less" -> "Less sugar"; "No sugar" stays as it is. Same rule as the app. */
    public String summaryNameOf(MenuOption option) {
        if (summaryNoun == null || summaryNoun.isBlank()) return option.getName();
        if (option.getName().toLowerCase().contains(summaryNoun.toLowerCase())) return option.getName();
        return option.getName() + " " + summaryNoun;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public SelectionType getSelectionType() { return selectionType; }
    public void setSelectionType(SelectionType selectionType) { this.selectionType = selectionType; }
    public boolean isRequired() { return required; }
    public void setRequired(boolean required) { this.required = required; }
    public int getMaxSelect() { return maxSelect; }
    public void setMaxSelect(int maxSelect) { this.maxSelect = (short) maxSelect; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public boolean isNeedsIcedDrink() { return needsIcedDrink; }
    public void setNeedsIcedDrink(boolean needsIcedDrink) { this.needsIcedDrink = needsIcedDrink; }
    public String getSummaryNoun() { return summaryNoun; }
    public void setSummaryNoun(String summaryNoun) { this.summaryNoun = summaryNoun == null || summaryNoun.isBlank() ? null : summaryNoun; }
    public List<MenuOption> getOptions() { return options; }
}
