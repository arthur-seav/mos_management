package mos.management.dashboard.repository;

import mos.management.dashboard.entity.MenuOption;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MenuOptionRepository extends JpaRepository<MenuOption, Long> {
}
